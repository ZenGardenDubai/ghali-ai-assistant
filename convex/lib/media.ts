/**
 * Media type detection and utility helpers.
 * Pure functions — no Convex context needed.
 */

// ============================================================================
// Supported MIME Types
// ============================================================================

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

/** Audio types Gemini Flash can process natively. */
const AUDIO_TYPES = [
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
  "audio/webm",
  "audio/amr",
] as const;

/** Video types Gemini Flash can process natively. */
const VIDEO_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/webm",
  "video/3gpp",
  "video/mov",
  "video/avi",
  "video/x-flv",
  "video/mpg",
  "video/wmv",
] as const;

const TEXT_DOCUMENT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/xml",
  "application/json",
  "application/xml",
] as const;

const OFFICE_DOCUMENT_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
] as const;

const ALL_DOCUMENT_TYPES = [
  "application/pdf",
  ...TEXT_DOCUMENT_TYPES,
  ...OFFICE_DOCUMENT_TYPES,
] as const;

// ============================================================================
// Type Detection Functions
// ============================================================================

/**
 * Normalize a MIME type: lowercase, strip codecs/charset suffixes.
 * e.g. "Image/JPEG; charset=utf-8" → "image/jpeg"
 */
export function normalizeMimeType(mimeType: string): string {
  return (mimeType.toLowerCase().split(";")[0] ?? "").trim();
}

/** Check if MIME type is a supported image (jpeg, png, webp, heic, heif). */
export function isImageType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return (IMAGE_TYPES as readonly string[]).includes(normalized);
}

/** Check if MIME type is a supported audio format for Gemini. */
export function isAudioType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return (AUDIO_TYPES as readonly string[]).includes(normalized);
}

/**
 * Check if MIME type is a WhatsApp voice note (user speaking).
 * WhatsApp always sends voice notes as audio/ogg with opus codec.
 * Other audio formats (mp3, m4a, wav, etc.) are forwarded files.
 */
export function isVoiceNote(mimeType: string): boolean {
  return normalizeMimeType(mimeType) === "audio/ogg";
}

/** Check if MIME type is a supported video format for Gemini. */
export function isVideoType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return (VIDEO_TYPES as readonly string[]).includes(normalized);
}

/** Check if MIME type is a supported document (pdf, text, office). */
export function isDocumentType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return (ALL_DOCUMENT_TYPES as readonly string[]).includes(normalized);
}

/** Check if MIME type is a text document that can be decoded as UTF-8 directly. */
export function isTextDocumentType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return (TEXT_DOCUMENT_TYPES as readonly string[]).includes(normalized);
}

/** Check if MIME type is an Office document (docx, pptx, xlsx) requiring CloudConvert. */
export function isOfficeDocumentType(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return (OFFICE_DOCUMENT_TYPES as readonly string[]).includes(normalized);
}

/** Check if MIME type is any supported media (image, audio, video, or document). */
export function isSupportedMediaType(mimeType: string): boolean {
  return (
    isImageType(mimeType) ||
    isAudioType(mimeType) ||
    isVideoType(mimeType) ||
    isDocumentType(mimeType)
  );
}

/**
 * Check if extracted content should be indexed in RAG.
 * Only documents (PDF, text, office) — not images, audio, or video.
 */
export function isRagIndexable(mimeType: string): boolean {
  return isDocumentType(mimeType);
}

// ============================================================================
// Office Format Mapping (for CloudConvert)
// ============================================================================

const OFFICE_FORMAT_MAP: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

/** Get the CloudConvert input format string for an Office MIME type. */
export function getOfficeFormat(mimeType: string): string | null {
  const normalized = normalizeMimeType(mimeType);
  return OFFICE_FORMAT_MAP[normalized] ?? null;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert ArrayBuffer to base64 string.
 * Browser-compatible (no Node.js Buffer).
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}
