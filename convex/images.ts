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
    referenceImageStorageId: v.optional(v.id("_storage")),
    traceId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, prompt, aspectRatio = "9:16", referenceImageStorageId, traceId }
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

    const isEditing = !!referenceImageStorageId;
    const truncatedPrompt =
      prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt;
    console.log(
      `[generateAndStoreImage] ${isEditing ? "EDIT" : "NEW"} — Prompt: "${truncatedPrompt}", Aspect: ${aspectRatio}`
    );

    // Fetch user for analytics (phone + tier)
    const user = await ctx.runQuery(internal.users.internalGetUser, {
      userId,
    }) as { phone: string; tier: string } | null;

    const startMs = Date.now();
    try {
      const ai = new GoogleGenAI({ apiKey });

      // Build contents: for editing, include the reference image + text prompt
      // For new generation, just the text prompt
      let contents: Parameters<typeof ai.models.generateContent>[0]["contents"];
      if (referenceImageStorageId) {
        // Ownership check: verify the storageId belongs to this user
        // (could be in mediaFiles from uploads or generatedImages from prior generations)
        const [mediaUrl, generatedUrl] = await Promise.all([
          ctx.runQuery(internal.mediaStorage.getStorageUrl, { storageId: referenceImageStorageId, userId }),
          ctx.runQuery(internal.imageStorage.getGeneratedImageUrl, { storageId: referenceImageStorageId, userId }),
        ]);
        if (!mediaUrl && !generatedUrl) {
          return { success: false, error: "Reference image not found or does not belong to you." };
        }

        // Fetch the reference image from Convex storage
        const imageBlob = await ctx.storage.get(referenceImageStorageId);
        if (!imageBlob) {
          return { success: false, error: "Reference image not found in storage." };
        }

        // Validate MIME type — only images can be used as references
        const referenceMimeType = imageBlob.type || "application/octet-stream";
        if (!referenceMimeType.startsWith("image/")) {
          return { success: false, error: "Reference file must be an image." };
        }

        // Enforce max size to avoid OOM in serverless (5MB)
        const MAX_REF_IMAGE_BYTES = 5 * 1024 * 1024;
        const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
        if (imageBytes.length > MAX_REF_IMAGE_BYTES) {
          return { success: false, error: "Reference image is too large (max 5MB). Please send a smaller image." };
        }

        // Chunk to avoid stack overflow with large images
        const chunks: string[] = [];
        const chunkSize = 8192;
        for (let i = 0; i < imageBytes.length; i += chunkSize) {
          chunks.push(String.fromCharCode(...imageBytes.subarray(i, i + chunkSize)));
        }
        const base64Image = btoa(chunks.join(""));
        contents = [
          {
            role: "user" as const,
            parts: [
              {
                inlineData: {
                  data: base64Image,
                  mimeType: referenceMimeType,
                },
              },
              { text: prompt },
            ],
          },
        ];
      } else {
        contents = prompt;
      }

      const response = await ai.models.generateContent({
        model: MODELS.IMAGE_GENERATION,
        contents,
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
        if (user) {
          await ctx.scheduler.runAfter(0, internal.analytics.trackImageGenerated, {
            phone: user.phone,
            success: false,
            latency_ms: Date.now() - startMs,
            model: MODELS.IMAGE_GENERATION,
            tier: user.tier,
            traceId,
          });
        }
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

      if (user) {
        await ctx.scheduler.runAfter(0, internal.analytics.trackImageGenerated, {
          phone: user.phone,
          success: true,
          latency_ms: Date.now() - startMs,
          model: MODELS.IMAGE_GENERATION,
          tier: user.tier,
          traceId,
        });
        await ctx.scheduler.runAfter(0, internal.analytics.trackFeatureUsed, {
          phone: user.phone,
          feature: isEditing ? "image_editing" : "image_generation",
          tier: user.tier,
        });
      }

      return { success: true, imageUrl, description };
    } catch (error) {
      console.error("[generateAndStoreImage] Failed:", error);
      if (user) {
        await ctx.scheduler.runAfter(0, internal.analytics.trackImageGenerated, {
          phone: user.phone,
          success: false,
          latency_ms: Date.now() - startMs,
          model: MODELS.IMAGE_GENERATION,
          tier: user.tier,
          traceId,
        });
      }
      return {
        success: false,
        error: isEditing
          ? "Image editing failed. Please try again with a different prompt."
          : "Image generation failed. Please try again with a different prompt.",
      };
    }
  },
});
