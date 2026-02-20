"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";
import { MODELS } from "./models";
import { IMAGE_RETENTION_MS } from "./constants";

/**
 * Generate an image using Gemini and store it in Convex file storage.
 * Returns a public URL that can be sent via WhatsApp.
 */
export const generateAndStoreImage = internalAction({
  args: {
    userId: v.id("users"),
    prompt: v.string(),
    aspectRatio: v.optional(
      v.union(v.literal("9:16"), v.literal("16:9"), v.literal("1:1"))
    ),
  },
  handler: async (
    ctx,
    { userId, prompt, aspectRatio = "9:16" }
  ): Promise<{
    success: boolean;
    imageUrl?: string;
    description?: string;
    error?: string;
  }> => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "Google API key not configured" };
    }

    const truncatedPrompt =
      prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt;
    console.log(
      `[generateAndStoreImage] Prompt: "${truncatedPrompt}", Aspect: ${aspectRatio}`
    );

    try {
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: MODELS.IMAGE_GENERATION,
        contents: prompt,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio },
        },
      });

      // Extract image and text from response parts
      let imageBase64: string | undefined;
      let mimeType: string | undefined;
      let description: string | undefined;

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.text) {
          description = part.text;
        }
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType;
        }
      }

      if (!imageBase64 || !mimeType) {
        return {
          success: false,
          error:
            "No image was generated. The model may have declined the request.",
        };
      }

      // Convert base64 → Uint8Array → Blob → Convex storage
      const binaryString = atob(imageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const storageId = await ctx.storage.store(blob);

      // Track image for cleanup
      await ctx.runMutation(internal.imageStorage.trackGeneratedImage, {
        userId,
        storageId,
        expiresAt: Date.now() + IMAGE_RETENTION_MS,
      });

      // Get public URL
      const imageUrl = await ctx.storage.getUrl(storageId);
      if (!imageUrl) {
        return { success: false, error: "Failed to get storage URL" };
      }

      console.log(
        `[generateAndStoreImage] Stored image: ${storageId}, size: ${bytes.length}`
      );

      return { success: true, imageUrl, description };
    } catch (error) {
      console.error("[generateAndStoreImage] Failed:", error);
      return {
        success: false,
        error: `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
