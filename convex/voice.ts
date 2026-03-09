"use node";

/**
 * Voice message transcription using OpenAI Whisper.
 * Downloads audio from 360dialog (fresh) or Convex file storage (re-transcription),
 * and returns the transcript with the storage ID.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";
import { VOICE_MIN_SIZE_BYTES, VOICE_MAX_SIZE_BYTES } from "./constants";
import { getAudioExtension } from "./lib/voice";

/**
 * Download audio, store in Convex file storage, and transcribe using OpenAI Whisper.
 *
 * Accepts either:
 * - A 360dialog media ID (`mediaId`): downloads via 360dialog API, stores audio.
 * - A Convex storage URL (`mediaUrl` + `existingStorageId`): re-transcription,
 *   no auth needed and audio is not re-stored.
 *
 * @returns `{ transcript, storageId }` or null on failure
 */
export const transcribeVoiceMessage = internalAction({
  args: {
    mediaUrl: v.optional(v.string()),
    mediaId: v.optional(v.string()),
    mediaType: v.string(),
    /** Present when re-transcribing from Convex storage — skips re-storing. */
    existingStorageId: v.optional(v.id("_storage")),
  },
  returns: v.union(
    v.object({ transcript: v.string(), storageId: v.id("_storage") }),
    v.null()
  ),
  handler: async (ctx, { mediaUrl, mediaId, mediaType, existingStorageId }) => {
    const startTime = Date.now();

    try {
      let audioBuffer: ArrayBuffer;

      if (existingStorageId != null && mediaUrl) {
        // Re-transcription from Convex storage — validate URL origin
        let parsed: URL;
        try {
          parsed = new URL(mediaUrl);
        } catch {
          console.error("[Voice] Invalid media URL");
          return null;
        }
        const isConvexStorageUrl =
          parsed.protocol === "https:" && parsed.hostname.endsWith(".convex.cloud");
        if (!isConvexStorageUrl) {
          console.error("[Voice] existingStorageId requires Convex storage URL");
          return null;
        }
        console.log(`[Voice] downloading from Convex storage | type: ${mediaType}`);
        const response = await fetch(mediaUrl);
        if (!response.ok) {
          console.error(`[Voice] Storage download failed: ${response.status} ${response.statusText}`);
          return null;
        }
        audioBuffer = await response.arrayBuffer();
      } else if (mediaId) {
        // Fresh voice note from 360dialog — two-step download
        const apiKey = process.env.DIALOG360_API_KEY;
        if (!apiKey) {
          console.error("[Voice] DIALOG360_API_KEY not configured");
          return null;
        }

        console.log(`[Voice] resolving 360dialog media ID | type: ${mediaType}`);
        const metaResponse = await fetch(
          `https://waba.360dialog.io/v1/media/${mediaId}`,
          { method: "GET", headers: { "D360-API-KEY": apiKey } }
        );
        if (!metaResponse.ok) {
          console.error(`[Voice] Media URL fetch failed: ${metaResponse.status}`);
          return null;
        }
        const meta = (await metaResponse.json()) as { url?: string };
        if (!meta.url) {
          console.error("[Voice] Media URL missing in 360dialog response");
          return null;
        }

        console.log(`[Voice] downloading from 360dialog | type: ${mediaType}`);
        const fileResponse = await fetch(meta.url, {
          headers: { "D360-API-KEY": apiKey },
        });
        if (!fileResponse.ok) {
          console.error(`[Voice] Download failed: ${fileResponse.status} ${fileResponse.statusText}`);
          return null;
        }
        audioBuffer = await fileResponse.arrayBuffer();
      } else {
        console.error("[Voice] No mediaUrl or mediaId provided");
        return null;
      }

      const audioBytes = new Uint8Array(audioBuffer);

      // Size validation
      if (audioBytes.length < VOICE_MIN_SIZE_BYTES) {
        console.log(`[Voice] Audio too short: ${audioBytes.length} bytes (< 1KB)`);
        return null;
      }

      if (audioBytes.length > VOICE_MAX_SIZE_BYTES) {
        console.log(`[Voice] Audio too large: ${audioBytes.length} bytes (> 25MB)`);
        return null;
      }

      // Initialize OpenAI client
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        console.error("[Voice] OpenAI API key not configured");
        return null;
      }

      const openai = new OpenAI({ apiKey: openaiKey });

      // Create File object for Whisper API
      const extension = getAudioExtension(mediaType);
      const file = new File([audioBytes], `voice.${extension}`, {
        type: mediaType,
      });

      // Transcribe with Whisper
      console.log(`[Voice] transcribing | size: ${audioBytes.length} bytes`);
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        response_format: "text",
      });

      // Whisper with response_format:"text" returns a string directly,
      // but guard against SDK changes that might return an object
      const raw = transcription;
      const transcript = (
        typeof raw === "string" ? raw : (raw as { text?: string }).text ?? ""
      ).trim();
      const latencyMs = Date.now() - startTime;

      if (!transcript || transcript.length === 0) {
        console.log("[Voice] Empty transcription (silence?)");
        return null;
      }

      console.log(`[Voice] done | ${latencyMs}ms | ${transcript.length} chars`);

      // Store audio in Convex file storage (skip when re-transcribing from own storage)
      let storageId: Id<"_storage">;
      if (existingStorageId != null) {
        storageId = existingStorageId;
      } else {
        const blob = new Blob([audioBytes], { type: mediaType });
        storageId = await ctx.storage.store(blob);
        console.log(`[Voice] stored in Convex | storageId: ${storageId}`);
      }

      return { transcript, storageId };
    } catch (error) {
      console.error("[Voice] Transcription failed:", error);
      return null;
    }
  },
});
