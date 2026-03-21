"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
import { MODELS } from "./models";
import { IMAGE_RETENTION_MS } from "./constants";

/**
 * Infer the closest supported aspect ratio from raw image bytes.
 * Parses PNG and JPEG headers to extract width/height.
 * Falls back to "9:16" (portrait) if parsing fails.
 */
function inferAspectRatioFromBytes(bytes: Uint8Array): "9:16" | "16:9" | "1:1" {
  let width = 0;
  let height = 0;

  // PNG: magic \x89PNG\r\n\x1a\n (8 bytes), then IHDR chunk — width at offset 16, height at 20
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  }
  // JPEG: magic 0xFF 0xD8 — scan for SOF0/SOF1/SOF2 markers
  else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 8 < bytes.length) {
      if (bytes[i] !== 0xff) break;
      const marker = bytes[i + 1];
      const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        height = (bytes[i + 5] << 8) | bytes[i + 6];
        width = (bytes[i + 7] << 8) | bytes[i + 8];
        break;
      }
      i += 2 + segLen;
    }
  }

  if (width === 0 || height === 0) return "9:16";

  const ratio = width / height;
  if (ratio > 1.4) return "16:9";  // landscape
  if (ratio < 0.7) return "9:16";  // portrait
  return "1:1";                    // square-ish
}

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
    referenceImageStorageId: v.optional(v.string()),
    traceId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, prompt, aspectRatio, referenceImageStorageId, traceId }
  ): Promise<{
    success: boolean;
    imageUrl?: string;
    storageId?: string;
    description?: string;
    error?: string;
  }> => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "Google API key not configured" };
    }

    const refStorageId = referenceImageStorageId as Id<"_storage"> | undefined;
    const isEditing = !!refStorageId;
    // Resolve effective aspect ratio: caller may omit it to let us auto-infer from the reference image
    let effectiveAspectRatio: "9:16" | "16:9" | "1:1" = aspectRatio ?? "9:16";
    const truncatedPrompt =
      prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt;

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
      if (refStorageId) {
        // Ownership check: verify the storageId belongs to this user
        // (could be in mediaFiles from uploads or generatedImages from prior generations)
        const [mediaUrl, generatedUrl] = await Promise.all([
          ctx.runQuery(internal.mediaStorage.getStorageUrl, { storageId: refStorageId, userId }),
          ctx.runQuery(internal.imageStorage.getGeneratedImageUrl, { storageId: refStorageId, userId }),
        ]);
        if (!mediaUrl && !generatedUrl) {
          return { success: false, error: "Reference image not found or does not belong to you." };
        }

        // Fetch the reference image from Convex storage
        const imageBlob = await ctx.storage.get(refStorageId);
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

        // Auto-infer aspect ratio from image dimensions when caller didn't specify one
        if (!aspectRatio) {
          effectiveAspectRatio = inferAspectRatioFromBytes(imageBytes);
        }
        console.log(
          `[generateAndStoreImage] EDIT — Prompt: "${truncatedPrompt}", Aspect: ${effectiveAspectRatio}${!aspectRatio ? " (inferred)" : ""}`
        );

        // Chunk to avoid stack overflow with large images
        const chunks: string[] = [];
        const chunkSize = 8192;
        for (let i = 0; i < imageBytes.length; i += chunkSize) {
          chunks.push(String.fromCharCode(...imageBytes.subarray(i, i + chunkSize)));
        }
        const base64Image = btoa(chunks.join(""));
        // Use flat array format [imagePart, promptString] for native image editing.
        // The role/parts chat format treats the image as context for generation;
        // the flat array tells the model to transform the actual pixels.
        contents = [createPartFromBase64(base64Image, referenceMimeType), prompt];
      } else {
        contents = prompt;
        console.log(
          `[generateAndStoreImage] NEW — Prompt: "${truncatedPrompt}", Aspect: ${effectiveAspectRatio}`
        );
      }

      const response = await ai.models.generateContent({
        model: MODELS.IMAGE_GENERATION,
        contents,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: effectiveAspectRatio },
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

      return { success: true, imageUrl, storageId: storageId as string, description };
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
