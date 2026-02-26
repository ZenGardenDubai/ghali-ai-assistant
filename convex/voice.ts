"use node";

/**
 * Voice message transcription using OpenAI Whisper.
 * Downloads audio from Twilio, stores it in Convex file storage,
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
 * - A Twilio media URL (fresh voice note): requires Twilio Basic Auth, stores audio.
 * - A Convex storage URL (re-transcription): when `existingStorageId` is provided,
 *   no auth needed and audio is not re-stored.
 *
 * @returns `{ transcript, storageId }` or null on failure
 */
export const transcribeVoiceMessage = internalAction({
  args: {
    mediaUrl: v.string(),
    mediaType: v.string(),
    /** Present when re-transcribing from Convex storage — skips re-storing. */
    existingStorageId: v.optional(v.id("_storage")),
  },
  returns: v.union(
    v.object({ transcript: v.string(), storageId: v.id("_storage") }),
    v.null()
  ),
  handler: async (ctx, { mediaUrl, mediaType, existingStorageId }) => {
    const startTime = Date.now();

    try {
      // SSRF protection — strict origin validation via URL parsing
      let parsed: URL;
      try {
        parsed = new URL(mediaUrl);
      } catch {
        console.error("[Voice] Invalid media URL");
        return null;
      }

      const isTwilioUrl =
        parsed.protocol === "https:" && parsed.hostname === "api.twilio.com";
      const isConvexStorageUrl =
        parsed.protocol === "https:" && parsed.hostname.endsWith(".convex.cloud");

      if (existingStorageId != null) {
        if (!isConvexStorageUrl) {
          console.error("[Voice] existingStorageId requires Convex storage URL");
          return null;
        }
      } else if (!isTwilioUrl) {
        console.error("[Voice] Invalid media URL origin");
        return null;
      }

      // Download audio — Twilio needs Basic Auth, Convex storage URLs are pre-signed
      const headers: Record<string, string> = {};
      if (isTwilioUrl) {
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioToken = process.env.TWILIO_AUTH_TOKEN;

        if (!twilioSid || !twilioToken) {
          console.error("[Voice] Twilio credentials not configured");
          return null;
        }

        headers["Authorization"] = `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`;
      }

      const source = isTwilioUrl ? "Twilio" : "Convex storage";
      console.log(`[Voice] downloading from ${source} | type: ${mediaType}`);
      const response = await fetch(mediaUrl, { headers });

      if (!response.ok) {
        console.error(
          `[Voice] Download failed: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const audioBuffer = await response.arrayBuffer();

      const audioBytes = new Uint8Array(audioBuffer);

      // Size validation
      if (audioBytes.length < VOICE_MIN_SIZE_BYTES) {
        console.log(
          `[Voice] Audio too short: ${audioBytes.length} bytes (< 1KB)`
        );
        return null;
      }

      if (audioBytes.length > VOICE_MAX_SIZE_BYTES) {
        console.log(
          `[Voice] Audio too large: ${audioBytes.length} bytes (> 25MB)`
        );
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
      console.log(
        `[Voice] transcribing | size: ${audioBytes.length} bytes`
      );
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

      console.log(
        `[Voice] done | ${latencyMs}ms | ${transcript.length} chars`
      );

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
