"use node";

/**
 * File conversion via CloudConvert.
 * Called by the convertFile agent tool.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { convertViaCloudConvert } from "./documents";
import {
  CONVERSION_MAP,
  isConversionSupported,
  getFormatFromMime,
  FORMAT_TO_MIME,
} from "./lib/media";
import { MEDIA_MAX_SIZE_BYTES, MEDIA_RETENTION_MS } from "./constants";

export const convertAndStore = internalAction({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    sourceMediaType: v.string(),
    outputFormat: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      fileUrl: v.string(),
      outputFormat: v.string(),
      outputMime: v.string(),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, { userId, storageId, sourceMediaType, outputFormat }) => {
    const startTime = Date.now();

    // Resolve input format from MIME
    const inputFormat = getFormatFromMime(sourceMediaType);
    if (!inputFormat) {
      return {
        success: false as const,
        error: `Unsupported source format: ${sourceMediaType}`,
      };
    }

    // Validate conversion pair
    if (!isConversionSupported(inputFormat, outputFormat)) {
      const supported = CONVERSION_MAP[inputFormat]?.join(", ") ?? "none";
      return {
        success: false as const,
        error: `Cannot convert ${inputFormat} to ${outputFormat}. Supported: ${inputFormat} → ${supported}`,
      };
    }

    // Resolve output MIME
    const outputMime = FORMAT_TO_MIME[outputFormat];
    if (!outputMime) {
      return {
        success: false as const,
        error: `Unknown output format: ${outputFormat}`,
      };
    }

    // Download source file from Convex storage — verify ownership before access
    const sourceUrl = await ctx.runQuery(internal.mediaStorage.getStorageUrl, {
      storageId,
      userId,
    });
    if (!sourceUrl) {
      return {
        success: false as const,
        error: "File not found or access denied",
      };
    }

    let sourceBuffer: ArrayBuffer;
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        return {
          success: false as const,
          error: `Failed to download source file: ${response.status}`,
        };
      }
      sourceBuffer = await response.arrayBuffer();
    } catch (error) {
      console.error("[Conversion] Source download error:", error);
      return { success: false as const, error: "Failed to download source file" };
    }

    // File size check — reject files over the media limit
    if (sourceBuffer.byteLength > MEDIA_MAX_SIZE_BYTES) {
      const maxMB = MEDIA_MAX_SIZE_BYTES / (1024 * 1024);
      return {
        success: false as const,
        error: `File too large for conversion (max ${maxMB}MB)`,
      };
    }

    // Fetch user once for analytics (used in both success and failure paths)
    const user = await ctx.runQuery(internal.users.internalGetUser, { userId }) as { phone: string } | null;

    console.log(
      `[Conversion] converting ${inputFormat} → ${outputFormat} | size: ${sourceBuffer.byteLength} bytes`
    );

    // Convert via CloudConvert
    const converted = await convertViaCloudConvert(
      sourceBuffer,
      inputFormat,
      outputFormat
    );
    if (!converted) {
      if (user) {
        await ctx.scheduler.runAfter(0, internal.analytics.trackFileConverted, {
          phone: user.phone,
          input_format: inputFormat,
          output_format: outputFormat,
          success: false,
          latency_ms: Date.now() - startTime,
        });
      }
      return {
        success: false as const,
        error: "CloudConvert conversion failed",
      };
    }

    // Store converted file in Convex storage
    const blob = new Blob([converted], { type: outputMime });
    const resultStorageId = await ctx.storage.store(blob);
    const fileUrl = await ctx.storage.getUrl(resultStorageId);
    if (!fileUrl) {
      return {
        success: false as const,
        error: "Failed to get URL for converted file",
      };
    }

    // Track converted file for cleanup (same expiry as media files)
    await ctx.runMutation(internal.mediaStorage.trackMediaFile, {
      userId,
      storageId: resultStorageId,
      messageSid: `conversion_${Date.now()}`,
      mediaType: outputMime,
      expiresAt: Date.now() + MEDIA_RETENTION_MS,
    });

    const latencyMs = Date.now() - startTime;
    console.log(
      `[Conversion] done | ${inputFormat} → ${outputFormat} | ${latencyMs}ms | ${converted.byteLength} bytes`
    );

    if (user) {
      await ctx.scheduler.runAfter(0, internal.analytics.trackFileConverted, {
        phone: user.phone,
        input_format: inputFormat,
        output_format: outputFormat,
        success: true,
        latency_ms: latencyMs,
      });
    }

    return {
      success: true as const,
      fileUrl,
      outputFormat,
      outputMime,
    };
  },
});
