"use node";

/**
 * Voice message transcription using OpenAI Whisper.
 * Downloads audio from Twilio and returns the transcript.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import OpenAI from "openai";
import { VOICE_MIN_SIZE_BYTES, VOICE_MAX_SIZE_BYTES } from "./constants";
import { getAudioExtension } from "./lib/voice";

/**
 * Download audio from Twilio and transcribe using OpenAI Whisper.
 *
 * Twilio media URLs require Basic Auth (Account SID + Auth Token).
 *
 * @returns Transcribed text or null on failure
 */
export const transcribeVoiceMessage = internalAction({
  args: {
    mediaUrl: v.string(),
    mediaType: v.string(),
  },
  returns: v.union(
    v.object({ transcript: v.string(), storageId: v.union(v.id("_storage"), v.null()) }),
    v.null()
  ),
  handler: async (ctx, { mediaUrl, mediaType }) => {
    const startTime = Date.now();

    try {
      // Get Twilio credentials for media download
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;

      if (!twilioSid || !twilioToken) {
        console.error("[Voice] Twilio credentials not configured");
        return null;
      }

      // Validate URL origin (SSRF protection) — allow Twilio and Convex storage
      const host = new URL(mediaUrl).hostname;
      const isTwilioUrl = mediaUrl.startsWith("https://api.twilio.com/");
      const isConvexUrl = host.endsWith(".convex.cloud") || host.endsWith(".convex.site");
      if (!isTwilioUrl && !isConvexUrl) {
        console.error("[Voice] Invalid media URL origin");
        return null;
      }

      // Download audio — Twilio needs Basic Auth, Convex storage doesn't
      console.log(`[Voice] downloading | type: ${mediaType} | source: ${isTwilioUrl ? "twilio" : "storage"}`);
      const fetchOptions: RequestInit = isTwilioUrl
        ? { headers: { Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}` } }
        : {};
      const response = await fetch(mediaUrl, fetchOptions);

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

      // Store voice note in Convex storage for future reply-to-media
      // Skip if already downloaded from Convex storage (re-processing)
      let storageId: string | null = null;
      if (!isConvexUrl) {
        try {
          const blob = new Blob([audioBytes], { type: mediaType });
          storageId = await ctx.storage.store(blob);
          console.log(`[Voice] stored in storage: ${storageId}`);
        } catch (error) {
          console.error("[Voice] Storage store failed (non-fatal):", error);
        }
      }

      console.log(
        `[Voice] done | ${latencyMs}ms | ${transcript.length} chars`
      );

      return { transcript, storageId: storageId as any };
    } catch (error) {
      console.error("[Voice] Transcription failed:", error);
      return null;
    }
  },
});
