/**
 * Voice message utilities — pure helpers for audio type detection.
 */

import { normalizeMimeType, isAudioType } from "./media";

// Re-export isAudioType from media.ts (single source of truth)
export { isAudioType };

/**
 * Get file extension from MIME type for Whisper API.
 */
export function getAudioExtension(mimeType: string): string {
  const extensionMap: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/amr": "amr",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/aac": "aac",
    "audio/aiff": "aiff",
    "audio/flac": "flac",
  };

  return extensionMap[normalizeMimeType(mimeType)] || "ogg";
}
