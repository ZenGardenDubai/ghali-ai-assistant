"use node";

/**
 * Document processing — download from Twilio, extract content via Gemini/CloudConvert.
 *
 * Routes by MIME type:
 * - Text files (txt, csv, json, etc.) → UTF-8 decode directly
 * - Images + PDF → Gemini Flash multimodal extraction
 * - Office files (docx, pptx, xlsx) → CloudConvert → PDF → Gemini Flash
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { MODELS } from "./models";
import {
  MEDIA_MIN_SIZE_BYTES,
  MEDIA_MAX_SIZE_BYTES,
  MAX_EXTRACTION_LENGTH,
  CLOUDCONVERT_TIMEOUT_MS,
} from "./constants";
import {
  normalizeMimeType,
  isTextDocumentType,
  isOfficeDocumentType,
  arrayBufferToBase64,
  getOfficeFormat,
} from "./lib/media";

// ============================================================================
// Twilio Download
// ============================================================================

/**
 * Download media from Twilio with Basic Auth.
 * Validates URL origin (SSRF protection) and file size.
 */
async function downloadFromTwilio(
  mediaUrl: string
): Promise<
  | { success: true; data: ArrayBuffer; size: number }
  | { success: false; error: string }
> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;

  if (!twilioSid || !twilioToken) {
    console.error("[Documents] Twilio credentials not configured");
    return { success: false, error: "Twilio credentials not configured" };
  }

  // SSRF protection
  if (!mediaUrl.startsWith("https://api.twilio.com/")) {
    console.error("[Documents] Invalid media URL origin");
    return { success: false, error: "Invalid media URL origin" };
  }

  try {
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
      },
    });

    if (!response.ok) {
      console.error(
        `[Documents] Download failed: ${response.status} ${response.statusText}`
      );
      return { success: false, error: `Download failed: ${response.status}` };
    }

    const data = await response.arrayBuffer();
    const size = data.byteLength;

    if (size < MEDIA_MIN_SIZE_BYTES) {
      console.log(`[Documents] File too small: ${size} bytes`);
      return { success: false, error: "File too small or empty" };
    }

    if (size > MEDIA_MAX_SIZE_BYTES) {
      console.log(`[Documents] File too large: ${size} bytes`);
      return { success: false, error: `File too large (max ${MEDIA_MAX_SIZE_BYTES / (1024 * 1024)}MB)` };
    }

    return { success: true, data, size };
  } catch (error) {
    console.error("[Documents] Download error:", error);
    return { success: false, error: "Failed to download file" };
  }
}

// ============================================================================
// CloudConvert (Office → PDF)
// ============================================================================

/**
 * Convert an Office file (docx/pptx/xlsx) to PDF via CloudConvert API v2.
 * Returns the PDF as ArrayBuffer, or null on failure.
 */
async function convertViaCloudConvert(
  buffer: ArrayBuffer,
  inputFormat: string
): Promise<ArrayBuffer | null> {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) {
    console.error("[Documents] CLOUDCONVERT_API_KEY not configured");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CLOUDCONVERT_TIMEOUT_MS
  );

  try {
    // Step 1: Create job with upload → convert → export tasks
    const jobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        tasks: {
          upload: { operation: "import/upload" },
          convert: {
            operation: "convert",
            input: ["upload"],
            input_format: inputFormat,
            output_format: "pdf",
          },
          export: {
            operation: "export/url",
            input: ["convert"],
          },
        },
      }),
    });

    if (!jobResponse.ok) {
      console.error(
        `[Documents] CloudConvert job creation failed: ${jobResponse.status}`
      );
      return null;
    }

    const job = (await jobResponse.json()) as {
      data: {
        id: string;
        tasks: Array<{
          id: string;
          name: string;
          operation: string;
          result?: { form?: { url: string; parameters: Record<string, string> }; files?: Array<{ url: string }> };
        }>;
      };
    };

    // Step 2: Upload the file
    const uploadTask = job.data.tasks.find(
      (t) => t.name === "upload"
    );
    if (!uploadTask?.result?.form) {
      console.error(
        "[Documents] CloudConvert upload task not found. Tasks:",
        JSON.stringify(job.data.tasks.map((t) => ({ name: t.name, operation: t.operation, hasResult: !!t.result })))
      );
      return null;
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(
      uploadTask.result.form.parameters
    )) {
      formData.append(key, value);
    }
    formData.append("file", new Blob([buffer]), `document.${inputFormat}`);

    console.log(
      `[Documents] CloudConvert uploading to: ${uploadTask.result.form.url.substring(0, 80)}...`
    );

    const uploadResponse = await fetch(uploadTask.result.form.url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!uploadResponse.ok) {
      console.error(
        `[Documents] CloudConvert upload failed: ${uploadResponse.status}`
      );
      return null;
    }

    // Step 3: Poll for completion
    const jobId = job.data.id;
    let attempts = 0;
    const maxAttempts = 30; // 30s with 1s intervals

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch(
        `https://api.cloudconvert.com/v2/jobs/${jobId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        }
      );

      if (!statusResponse.ok) {
        console.warn(
          `[Documents] CloudConvert poll ${statusResponse.status} (attempt ${attempts})`
        );
        // Break early on client errors (4xx) — not retryable
        if (statusResponse.status >= 400 && statusResponse.status < 500) {
          console.error("[Documents] CloudConvert: non-retryable error");
          return null;
        }
        continue;
      }

      const statusData = (await statusResponse.json()) as {
        data: {
          status: string;
          tasks: Array<{
            name: string;
            status: string;
            result?: { files?: Array<{ url: string }> };
          }>;
        };
      };

      if (statusData.data.status === "error") {
        const failedTasks = statusData.data.tasks
          .filter((t) => t.status === "error")
          .map((t) => ({ name: t.name, message: (t as Record<string, unknown>).message }));
        console.error(
          "[Documents] CloudConvert job failed:",
          JSON.stringify(failedTasks)
        );
        return null;
      }

      if (statusData.data.status === "finished") {
        // Find the export task result
        const exportTask = statusData.data.tasks.find(
          (t) => t.name === "export"
        );
        const fileUrl = exportTask?.result?.files?.[0]?.url;
        if (!fileUrl) {
          console.error("[Documents] CloudConvert: no export URL");
          return null;
        }

        // Validate export URL origin (defense-in-depth)
        // CloudConvert uses regional subdomains: storage.cloudconvert.com,
        // us-east.storage.cloudconvert.com, eu-central.storage.cloudconvert.com, etc.
        const exportHost = new URL(fileUrl).hostname;
        if (
          exportHost !== "storage.cloudconvert.com" &&
          !exportHost.endsWith(".storage.cloudconvert.com")
        ) {
          console.error(
            `[Documents] CloudConvert: unexpected export URL host: ${exportHost}`
          );
          return null;
        }

        // Download the converted PDF
        const pdfResponse = await fetch(fileUrl, {
          signal: controller.signal,
        });
        if (!pdfResponse.ok) {
          console.error("[Documents] CloudConvert PDF download failed");
          return null;
        }

        return await pdfResponse.arrayBuffer();
      }
    }

    console.error("[Documents] CloudConvert timeout");
    return null;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.error("[Documents] CloudConvert timeout (aborted)");
    } else {
      console.error("[Documents] CloudConvert error:", error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Main Processing Action
// ============================================================================

/**
 * Process a media file: download from Twilio, extract text content.
 *
 * Routes based on MIME type:
 * - Text documents → UTF-8 decode
 * - Images/PDF → Gemini Flash multimodal
 * - Office files → CloudConvert to PDF → Gemini Flash
 *
 * Returns extracted text (truncated to MAX_EXTRACTION_LENGTH) or null.
 */
export const processMedia = internalAction({
  args: {
    mediaUrl: v.string(),
    mediaType: v.string(),
    userPrompt: v.optional(v.string()),
    isReprocessing: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({ extracted: v.string(), storageId: v.union(v.id("_storage"), v.null()) }),
    v.null()
  ),
  handler: async (ctx, { mediaUrl, mediaType, userPrompt, isReprocessing }) => {
    const startTime = Date.now();
    console.log(`[Documents] processing | type: ${mediaType} | reprocessing: ${!!isReprocessing}`);

    let data: ArrayBuffer;
    let storageId: string | null = null;

    if (isReprocessing) {
      // Re-processing: download from Convex storage URL (no Twilio auth needed)
      // Validate URL origin — must be a Convex storage URL
      const host = new URL(mediaUrl).hostname;
      if (!host.endsWith(".convex.cloud") && !host.endsWith(".convex.site")) {
        console.error(`[Documents] Invalid reprocessing URL origin: ${host}`);
        return null;
      }
      try {
        const response = await fetch(mediaUrl);
        if (!response.ok) {
          console.error(`[Documents] Storage download failed: ${response.status}`);
          return null;
        }
        data = await response.arrayBuffer();
      } catch (error) {
        console.error("[Documents] Storage download error:", error);
        return null;
      }
    } else {
      // First-time: download from Twilio
      const download = await downloadFromTwilio(mediaUrl);
      if (!download.success) {
        console.error(`[Documents] Download failed: ${download.error}`);
        return null;
      }
      data = download.data;

      // Store in Convex file storage for future reply-to-media
      try {
        const blob = new Blob([data], { type: mediaType });
        storageId = await ctx.storage.store(blob);
      } catch (error) {
        console.error("[Documents] Storage store failed:", error);
        // Non-fatal — continue with extraction
      }
    }

    console.log(`[Documents] downloaded | size: ${data.byteLength} bytes`);

    try {
      let extracted: string;

      if (isTextDocumentType(mediaType)) {
        // Text files: decode directly
        const decoder = new TextDecoder("utf-8");
        extracted = decoder.decode(data);
        console.log(
          `[Documents] text decoded | length: ${extracted.length}`
        );
      } else if (isOfficeDocumentType(mediaType)) {
        // Office files: CloudConvert → PDF → Gemini
        const format = getOfficeFormat(mediaType);
        if (!format) {
          console.error("[Documents] Unknown office format");
          return null;
        }

        console.log(`[Documents] converting ${format} → PDF via CloudConvert`);
        const pdfBuffer = await convertViaCloudConvert(data, format);
        if (!pdfBuffer) {
          console.error("[Documents] CloudConvert conversion failed");
          return null;
        }

        console.log(
          `[Documents] converted to PDF | size: ${pdfBuffer.byteLength} bytes`
        );
        extracted = await extractViaGemini(
          pdfBuffer,
          "application/pdf",
          userPrompt
        );
      } else {
        // Images, PDF, audio, video: Gemini multimodal directly
        extracted = await extractViaGemini(
          data,
          normalizeMimeType(mediaType),
          userPrompt
        );
      }

      // Truncate if needed
      if (extracted.length > MAX_EXTRACTION_LENGTH) {
        console.log(
          `[Documents] truncated from ${extracted.length} to ${MAX_EXTRACTION_LENGTH}`
        );
        extracted = extracted.substring(0, MAX_EXTRACTION_LENGTH);
      }

      const latencyMs = Date.now() - startTime;
      console.log(
        `[Documents] done | ${latencyMs}ms | ${extracted.length} chars`
      );

      if (extracted.length === 0) return null;

      return {
        extracted,
        storageId: storageId as import("./_generated/dataModel").Id<"_storage"> | null,
      };
    } catch (error) {
      console.error("[Documents] Processing failed:", error);
      return null;
    }
  },
});

// ============================================================================
// Gemini Flash Extraction
// ============================================================================

/**
 * Extract/analyze content from a binary file using Gemini Flash multimodal.
 * Supports images, PDF, audio, and video.
 */
async function extractViaGemini(
  buffer: ArrayBuffer,
  mimeType: string,
  userPrompt?: string
): Promise<string> {
  const base64 = arrayBufferToBase64(buffer);

  const prompt = userPrompt
    ? `Analyze this file and answer the user's question.

The user asks: "${userPrompt}"

Extract the relevant information, then answer their question directly.
Be thorough but concise. Use plain text only.`
    : `Analyze this file and extract its content.

If it's an image, describe what you see and extract any visible text.
If it's a document, extract the full text content.
If it's audio, transcribe the speech and note any key sounds.
If it's video, describe the visual content and transcribe any speech.
Be thorough. Use plain text only.`;

  const result = await generateText({
    model: google(MODELS.FLASH),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: base64,
            mediaType: mimeType,
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
    temperature: 0.3,
  });

  return result.text.trim();
}
