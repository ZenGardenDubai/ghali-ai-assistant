/**
 * Voice message utilities — pure helpers for audio type detection.
 */

/**
 * Audio MIME types supported by WhatsApp voice messages.
 * WhatsApp typically sends voice notes as audio/ogg with opus codec.
 */
const VOICE_AUDIO_TYPES = [
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/amr",
  "audio/wav",
  "audio/webm",
  "audio/aac",
];

/**
 * Check if a MIME type is an audio type we can transcribe.
 * Normalizes to lowercase and strips codec info (e.g., "audio/ogg; codecs=opus" → "audio/ogg").
 */
export function isAudioType(mimeType: string): boolean {
  const normalized = (mimeType.toLowerCase().split(";")[0] ?? "").trim();
  return VOICE_AUDIO_TYPES.includes(normalized);
}

/**
 * Get file extension from MIME type for Whisper API.
 */
export function getAudioExtension(mimeType: string): string {
  const extensionMap: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/amr": "amr",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/aac": "aac",
  };

  const normalized = (mimeType.toLowerCase().split(";")[0] ?? "").trim();
  return extensionMap[normalized] || "ogg";
}
