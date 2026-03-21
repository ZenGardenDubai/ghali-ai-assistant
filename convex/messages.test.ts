import { describe, it, expect } from "vitest";
import {
  parseImageToolResult,
  extractImageFromSteps,
  extractToolResultText,
  extractConvertedFileFromSteps,
  convertedFormatToWhatsAppType,
  resolveMediaSid,
} from "./messages";

describe("parseImageToolResult", () => {
  it("parses a valid image JSON result", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/img.png",
      caption: "A beautiful sunset",
    });
    expect(parseImageToolResult(json)).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "A beautiful sunset",
    });
  });

  it("returns null for non-JSON input", () => {
    expect(parseImageToolResult("not json")).toBeNull();
  });

  it("returns null for wrong type", () => {
    const json = JSON.stringify({ type: "text", imageUrl: "x", caption: "y" });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("includes storageId when present", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/img.png",
      caption: "A motorbike",
      storageId: "kg2abc123def456",
    });
    expect(parseImageToolResult(json)).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "A motorbike",
      storageId: "kg2abc123def456",
    });
  });

  it("omits storageId when not in JSON", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/img.png",
      caption: "A sunset",
    });
    const result = parseImageToolResult(json);
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("storageId");
  });
});

describe("extractToolResultText", () => {
  it("extracts from new format: output { type: 'text', value: '...' }", () => {
    expect(
      extractToolResultText({ output: { type: "text", value: "hello" } })
    ).toBe("hello");
  });

  it("extracts from new format: output { type: 'json', value: {...} }", () => {
    const result = extractToolResultText({
      output: { type: "json", value: { foo: "bar" } },
    });
    expect(result).toBe('{"foo":"bar"}');
  });

  it("extracts from legacy format: output is plain string", () => {
    expect(extractToolResultText({ output: "hello" })).toBe("hello");
  });

  it("extracts from legacy format: result is plain string", () => {
    expect(extractToolResultText({ result: "hello" })).toBe("hello");
  });

  it("prefers output over result", () => {
    expect(
      extractToolResultText({
        output: { type: "text", value: "from-output" },
        result: "from-result",
      })
    ).toBe("from-output");
  });

  it("returns null when no text available", () => {
    expect(extractToolResultText({})).toBeNull();
    expect(extractToolResultText({ output: undefined })).toBeNull();
  });
});

describe("extractImageFromSteps", () => {
  it("finds image result with new output format", () => {
    const imageJson = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/img.png",
      caption: "A sunset",
    });
    const steps = [
      {
        toolResults: [{ output: { type: "text", value: imageJson } }],
      },
    ];
    expect(extractImageFromSteps(steps)).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "A sunset",
    });
  });

  it("finds image result with legacy output format", () => {
    const imageJson = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/img.png",
      caption: "A sunset",
    });
    const steps = [
      {
        toolResults: [{ output: imageJson }],
      },
    ];
    expect(extractImageFromSteps(steps)).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "A sunset",
    });
  });

  it("returns null when no image result exists", () => {
    const steps = [
      { toolResults: [{ output: { type: "text", value: '{"type":"text","content":"hello"}' } }] },
    ];
    expect(extractImageFromSteps(steps)).toBeNull();
  });

  it("returns null for empty steps", () => {
    expect(extractImageFromSteps([])).toBeNull();
  });
});

describe("extractConvertedFileFromSteps", () => {
  it("finds conversion result with new output format", () => {
    const conversionJson = JSON.stringify({
      type: "conversion",
      fileUrl: "https://example.com/file.pdf",
      caption: "Here's your file converted to PDF.",
      outputFormat: "pdf",
    });
    const steps = [
      {
        toolResults: [{ output: { type: "text", value: conversionJson } }],
      },
    ];
    expect(extractConvertedFileFromSteps(steps)).toEqual({
      fileUrl: "https://example.com/file.pdf",
      caption: "Here's your file converted to PDF.",
      outputFormat: "pdf",
    });
  });

  it("finds conversion result with legacy output format", () => {
    const conversionJson = JSON.stringify({
      type: "conversion",
      fileUrl: "https://example.com/file.pdf",
      caption: "Here's your file converted to PDF.",
      outputFormat: "pdf",
    });
    const steps = [
      {
        toolResults: [{ output: conversionJson }],
      },
    ];
    expect(extractConvertedFileFromSteps(steps)).toEqual({
      fileUrl: "https://example.com/file.pdf",
      caption: "Here's your file converted to PDF.",
      outputFormat: "pdf",
    });
  });

  it("returns null when no conversion result exists", () => {
    const steps = [
      { toolResults: [{ output: { type: "text", value: "Some other text" } }] },
    ];
    expect(extractConvertedFileFromSteps(steps)).toBeNull();
  });

  it("returns null for empty steps", () => {
    expect(extractConvertedFileFromSteps([])).toBeNull();
  });
});

describe("convertedFormatToWhatsAppType", () => {
  it("maps document formats to 'document'", () => {
    expect(convertedFormatToWhatsAppType("pdf")).toBe("document");
    expect(convertedFormatToWhatsAppType("docx")).toBe("document");
    expect(convertedFormatToWhatsAppType("csv")).toBe("document");
  });

  it("maps image formats to 'image'", () => {
    expect(convertedFormatToWhatsAppType("png")).toBe("image");
    expect(convertedFormatToWhatsAppType("jpg")).toBe("image");
    expect(convertedFormatToWhatsAppType("webp")).toBe("image");
  });

  it("maps audio formats to 'audio'", () => {
    expect(convertedFormatToWhatsAppType("mp3")).toBe("audio");
    expect(convertedFormatToWhatsAppType("wav")).toBe("audio");
    expect(convertedFormatToWhatsAppType("ogg")).toBe("audio");
  });

  it("defaults unknown formats to 'document'", () => {
    expect(convertedFormatToWhatsAppType("xyz")).toBe("document");
  });
});

describe("resolveMediaSid", () => {
  it("returns messageSid when provided", () => {
    expect(resolveMediaSid("12345:67890", "storageAbc")).toBe("12345:67890");
  });

  it("returns inbound-<storageId> fallback when messageSid is undefined", () => {
    expect(resolveMediaSid(undefined, "storageAbc")).toBe("inbound-storageAbc");
  });

  it("returns inbound-<storageId> fallback when messageSid is null", () => {
    expect(resolveMediaSid(null, "storageXyz")).toBe("inbound-storageXyz");
  });

  it("returns inbound-<storageId> fallback when messageSid is empty string", () => {
    expect(resolveMediaSid("", "storageDef")).toBe("inbound-storageDef");
  });

  it("includes storageId in fallback to ensure uniqueness per file", () => {
    const sid1 = resolveMediaSid(undefined, "storage001");
    const sid2 = resolveMediaSid(undefined, "storage002");
    expect(sid1).not.toBe(sid2);
  });
});
