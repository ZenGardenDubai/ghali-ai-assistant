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
  CONVERSION_MAP,
  FORMAT_TO_MIME,
  isConversionSupported,
  getFormatFromMime,
  MEDIA_CATEGORY_PREFIX_MAP,
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

describe("CONVERSION_MAP", () => {
  it("has entries for all expected input formats", () => {
    const expected = ["pdf", "docx", "pptx", "xlsx", "png", "jpg", "webp", "mp3", "wav", "ogg"];
    for (const fmt of expected) {
      expect(CONVERSION_MAP[fmt]).toBeDefined();
      expect(CONVERSION_MAP[fmt]!.length).toBeGreaterThan(0);
    }
  });

  it("has entries for text document formats", () => {
    expect(CONVERSION_MAP["txt"]).toBeDefined();
    expect(CONVERSION_MAP["csv"]).toBeDefined();
    expect(CONVERSION_MAP["md"]).toBeDefined();
  });

  it("supports txt → pdf conversion", () => {
    expect(isConversionSupported("txt", "pdf")).toBe(true);
  });

  it("supports csv → pdf conversion", () => {
    expect(isConversionSupported("csv", "pdf")).toBe(true);
  });

  it("supports md → pdf conversion", () => {
    expect(isConversionSupported("md", "pdf")).toBe(true);
  });

  it("every output format has a MIME type in FORMAT_TO_MIME", () => {
    for (const outputs of Object.values(CONVERSION_MAP)) {
      for (const fmt of outputs) {
        expect(FORMAT_TO_MIME[fmt]).toBeDefined();
      }
    }
  });
});

describe("isConversionSupported", () => {
  it("returns true for pdf → docx", () => {
    expect(isConversionSupported("pdf", "docx")).toBe(true);
  });

  it("returns true for docx → pdf", () => {
    expect(isConversionSupported("docx", "pdf")).toBe(true);
  });

  it("returns true for png → webp", () => {
    expect(isConversionSupported("png", "webp")).toBe(true);
  });

  it("returns true for mp3 → wav", () => {
    expect(isConversionSupported("mp3", "wav")).toBe(true);
  });

  it("returns true for xlsx → csv", () => {
    expect(isConversionSupported("xlsx", "csv")).toBe(true);
  });

  it("returns false for unsupported conversion", () => {
    expect(isConversionSupported("pdf", "mp3")).toBe(false);
  });

  it("returns false for unknown input format", () => {
    expect(isConversionSupported("bmp", "png")).toBe(false);
  });

  it("returns false for same format", () => {
    expect(isConversionSupported("pdf", "pdf")).toBe(false);
  });
});

describe("getFormatFromMime", () => {
  it("returns pdf for application/pdf", () => {
    expect(getFormatFromMime("application/pdf")).toBe("pdf");
  });

  it("returns docx for Word MIME type", () => {
    expect(
      getFormatFromMime(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe("docx");
  });

  it("returns jpg for image/jpeg", () => {
    expect(getFormatFromMime("image/jpeg")).toBe("jpg");
  });

  it("returns mp3 for audio/mpeg", () => {
    expect(getFormatFromMime("audio/mpeg")).toBe("mp3");
  });

  it("returns mp3 for audio/mp3", () => {
    expect(getFormatFromMime("audio/mp3")).toBe("mp3");
  });

  it("normalizes MIME before lookup", () => {
    expect(getFormatFromMime("Image/PNG")).toBe("png");
  });

  it("strips charset suffix", () => {
    expect(getFormatFromMime("audio/wav; charset=utf-8")).toBe("wav");
  });

  it("returns null for unsupported MIME", () => {
    expect(getFormatFromMime("video/mp4")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getFormatFromMime("")).toBeNull();
  });

  it("returns txt for text/plain", () => {
    expect(getFormatFromMime("text/plain")).toBe("txt");
  });

  it("returns csv for text/csv", () => {
    expect(getFormatFromMime("text/csv")).toBe("csv");
  });

  it("returns md for text/markdown", () => {
    expect(getFormatFromMime("text/markdown")).toBe("md");
  });

  it("strips charset from text/plain; charset=utf-8", () => {
    expect(getFormatFromMime("text/plain; charset=utf-8")).toBe("txt");
  });
});

describe("MEDIA_CATEGORY_PREFIX_MAP", () => {
  it("maps image category to ['image/'] prefix array", () => {
    expect(MEDIA_CATEGORY_PREFIX_MAP.image).toEqual(["image/"]);
  });

  it("maps audio category to ['audio/'] prefix array", () => {
    expect(MEDIA_CATEGORY_PREFIX_MAP.audio).toEqual(["audio/"]);
  });

  it("maps video category to ['video/'] prefix array", () => {
    expect(MEDIA_CATEGORY_PREFIX_MAP.video).toEqual(["video/"]);
  });

  it("maps document category to both application/ and text/ prefixes", () => {
    expect(MEDIA_CATEGORY_PREFIX_MAP.document).toEqual(["application/", "text/"]);
  });

  it("document prefixes include application/ for PDFs and Office docs", () => {
    const prefixes = MEDIA_CATEGORY_PREFIX_MAP.document!;
    expect(prefixes.some((p) => "application/pdf".startsWith(p))).toBe(true);
    expect(
      prefixes.some((p) =>
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document".startsWith(p)
      )
    ).toBe(true);
  });

  it("document prefixes include text/ for plain text documents", () => {
    const prefixes = MEDIA_CATEGORY_PREFIX_MAP.document!;
    expect(prefixes.some((p) => "text/plain".startsWith(p))).toBe(true);
    expect(prefixes.some((p) => "text/csv".startsWith(p))).toBe(true);
    expect(prefixes.some((p) => "text/markdown".startsWith(p))).toBe(true);
  });

  it("maps any category to undefined (no filter)", () => {
    expect(MEDIA_CATEGORY_PREFIX_MAP.any).toBeUndefined();
  });

  it("has exactly five categories", () => {
    expect(Object.keys(MEDIA_CATEGORY_PREFIX_MAP)).toHaveLength(5);
  });
});
