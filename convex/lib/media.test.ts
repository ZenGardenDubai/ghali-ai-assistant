import { describe, it, expect } from "vitest";
import {
  normalizeMimeType,
  isImageType,
  isAudioType,
  isVoiceNote,
  isVideoType,
  isDocumentType,
  isTextDocumentType,
  isOfficeDocumentType,
  isSupportedMediaType,
  isRagIndexable,
  getOfficeFormat,
  arrayBufferToBase64,
} from "./media";

describe("normalizeMimeType", () => {
  it("lowercases and trims", () => {
    expect(normalizeMimeType("Image/JPEG")).toBe("image/jpeg");
  });

  it("strips charset suffix", () => {
    expect(normalizeMimeType("text/plain; charset=utf-8")).toBe("text/plain");
  });

  it("strips codecs suffix", () => {
    expect(normalizeMimeType("audio/ogg; codecs=opus")).toBe("audio/ogg");
  });

  it("handles empty string", () => {
    expect(normalizeMimeType("")).toBe("");
  });
});

describe("isImageType", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])(
    "returns true for %s",
    (type) => {
      expect(isImageType(type)).toBe(true);
    }
  );

  it("returns true with charset suffix", () => {
    expect(isImageType("image/jpeg; charset=utf-8")).toBe(true);
  });

  it("returns true case-insensitive", () => {
    expect(isImageType("Image/PNG")).toBe(true);
  });

  it("returns false for gif", () => {
    expect(isImageType("image/gif")).toBe(false);
  });

  it("returns false for audio", () => {
    expect(isImageType("audio/ogg")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isImageType("")).toBe(false);
  });
});

describe("isAudioType", () => {
  it.each([
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
  ])("returns true for %s", (type) => {
    expect(isAudioType(type)).toBe(true);
  });

  it("returns true with codecs suffix", () => {
    expect(isAudioType("audio/ogg; codecs=opus")).toBe(true);
  });

  it("returns true case-insensitive", () => {
    expect(isAudioType("Audio/OGG")).toBe(true);
  });

  it("returns false for video", () => {
    expect(isAudioType("video/mp4")).toBe(false);
  });

  it("returns false for image", () => {
    expect(isAudioType("image/jpeg")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAudioType("")).toBe(false);
  });
});

describe("isVoiceNote", () => {
  it("returns true for audio/ogg", () => {
    expect(isVoiceNote("audio/ogg")).toBe(true);
  });

  it("returns true for audio/ogg with codecs", () => {
    expect(isVoiceNote("audio/ogg; codecs=opus")).toBe(true);
  });

  it("returns true case-insensitive", () => {
    expect(isVoiceNote("Audio/OGG")).toBe(true);
  });

  it("returns false for mp3", () => {
    expect(isVoiceNote("audio/mpeg")).toBe(false);
  });

  it("returns false for mp4 audio", () => {
    expect(isVoiceNote("audio/mp4")).toBe(false);
  });

  it("returns false for wav", () => {
    expect(isVoiceNote("audio/wav")).toBe(false);
  });
});

describe("isVideoType", () => {
  it.each([
    "video/mp4",
    "video/mpeg",
    "video/webm",
    "video/3gpp",
    "video/mov",
    "video/avi",
    "video/x-flv",
    "video/mpg",
    "video/wmv",
  ])("returns true for %s", (type) => {
    expect(isVideoType(type)).toBe(true);
  });

  it("returns true case-insensitive", () => {
    expect(isVideoType("Video/MP4")).toBe(true);
  });

  it("returns false for audio", () => {
    expect(isVideoType("audio/ogg")).toBe(false);
  });

  it("returns false for image", () => {
    expect(isVideoType("image/jpeg")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isVideoType("")).toBe(false);
  });
});

describe("isDocumentType", () => {
  it("returns true for application/pdf", () => {
    expect(isDocumentType("application/pdf")).toBe(true);
  });

  it("returns true for text/plain", () => {
    expect(isDocumentType("text/plain")).toBe(true);
  });

  it("returns true for text/csv", () => {
    expect(isDocumentType("text/csv")).toBe(true);
  });

  it("returns true for docx MIME type", () => {
    expect(
      isDocumentType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe(true);
  });

  it("returns true for xlsx MIME type", () => {
    expect(
      isDocumentType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe(true);
  });

  it("returns false for images", () => {
    expect(isDocumentType("image/jpeg")).toBe(false);
  });

  it("returns false for audio", () => {
    expect(isDocumentType("audio/ogg")).toBe(false);
  });

  it("returns false for video", () => {
    expect(isDocumentType("video/mp4")).toBe(false);
  });
});

describe("isTextDocumentType", () => {
  it.each([
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    "text/xml",
    "application/json",
    "application/xml",
  ])("returns true for %s", (type) => {
    expect(isTextDocumentType(type)).toBe(true);
  });

  it("returns false for PDF", () => {
    expect(isTextDocumentType("application/pdf")).toBe(false);
  });

  it("returns false for docx", () => {
    expect(
      isTextDocumentType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe(false);
  });
});

describe("isOfficeDocumentType", () => {
  it("returns true for docx", () => {
    expect(
      isOfficeDocumentType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe(true);
  });

  it("returns true for pptx", () => {
    expect(
      isOfficeDocumentType(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      )
    ).toBe(true);
  });

  it("returns true for xlsx", () => {
    expect(
      isOfficeDocumentType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe(true);
  });

  it("returns false for PDF", () => {
    expect(isOfficeDocumentType("application/pdf")).toBe(false);
  });

  it("returns false for text/plain", () => {
    expect(isOfficeDocumentType("text/plain")).toBe(false);
  });
});

describe("isSupportedMediaType", () => {
  it("returns true for images", () => {
    expect(isSupportedMediaType("image/jpeg")).toBe(true);
  });

  it("returns true for audio", () => {
    expect(isSupportedMediaType("audio/ogg")).toBe(true);
  });

  it("returns true for video", () => {
    expect(isSupportedMediaType("video/mp4")).toBe(true);
  });

  it("returns true for documents", () => {
    expect(isSupportedMediaType("application/pdf")).toBe(true);
  });

  it("returns true for text files", () => {
    expect(isSupportedMediaType("text/plain")).toBe(true);
  });

  it("returns false for unknown types", () => {
    expect(isSupportedMediaType("application/octet-stream")).toBe(false);
  });
});

describe("isRagIndexable", () => {
  it("returns true for documents", () => {
    expect(isRagIndexable("application/pdf")).toBe(true);
    expect(isRagIndexable("text/plain")).toBe(true);
  });

  it("returns false for images", () => {
    expect(isRagIndexable("image/jpeg")).toBe(false);
  });

  it("returns false for audio", () => {
    expect(isRagIndexable("audio/ogg")).toBe(false);
  });

  it("returns false for video", () => {
    expect(isRagIndexable("video/mp4")).toBe(false);
  });
});

describe("getOfficeFormat", () => {
  it("returns docx for Word MIME type", () => {
    expect(
      getOfficeFormat(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe("docx");
  });

  it("returns pptx for PowerPoint MIME type", () => {
    expect(
      getOfficeFormat(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      )
    ).toBe("pptx");
  });

  it("returns xlsx for Excel MIME type", () => {
    expect(
      getOfficeFormat(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe("xlsx");
  });

  it("returns null for non-office types", () => {
    expect(getOfficeFormat("application/pdf")).toBeNull();
  });
});

describe("arrayBufferToBase64", () => {
  it("converts simple buffer to base64", () => {
    const encoder = new TextEncoder();
    const buffer = encoder.encode("Hello").buffer;
    expect(arrayBufferToBase64(buffer)).toBe(btoa("Hello"));
  });

  it("handles empty buffer", () => {
    const buffer = new ArrayBuffer(0);
    expect(arrayBufferToBase64(buffer)).toBe("");
  });

  it("handles binary data", () => {
    const bytes = new Uint8Array([0, 1, 255, 128, 64]);
    const result = arrayBufferToBase64(bytes.buffer);
    // Verify round-trip
    const decoded = atob(result);
    expect(decoded.charCodeAt(0)).toBe(0);
    expect(decoded.charCodeAt(1)).toBe(1);
    expect(decoded.charCodeAt(2)).toBe(255);
    expect(decoded.charCodeAt(3)).toBe(128);
    expect(decoded.charCodeAt(4)).toBe(64);
  });
});
