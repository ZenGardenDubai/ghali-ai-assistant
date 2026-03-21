import { describe, it, expect } from "vitest";
import {
  parseImageToolResult,
  extractImageFromSteps,
  parseConvertedFileResult,
  extractConvertedFileFromSteps,
  buildFileContextNote,
} from "../messages";

describe("parseImageToolResult", () => {
  it("parses valid JSON with type, imageUrl and caption", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/image.png",
      caption: "A sunset over Dubai",
    });
    expect(parseImageToolResult(json)).toEqual({
      imageUrl: "https://example.com/image.png",
      caption: "A sunset over Dubai",
    });
  });

  it("returns null for plain text", () => {
    expect(parseImageToolResult("Hello world")).toBeNull();
  });

  it("returns null for JSON without imageUrl", () => {
    const json = JSON.stringify({ type: "image", caption: "A sunset" });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for JSON without caption", () => {
    const json = JSON.stringify({ type: "image", imageUrl: "https://example.com/img.png" });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for JSON without type discriminator", () => {
    const json = JSON.stringify({ imageUrl: "https://example.com/img.png", caption: "test" });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for conversion type", () => {
    const json = JSON.stringify({
      type: "conversion",
      fileUrl: "https://example.com/file.pdf",
      caption: "Converted",
      outputFormat: "pdf",
    });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for non-object JSON", () => {
    expect(parseImageToolResult('"just a string"')).toBeNull();
    expect(parseImageToolResult("42")).toBeNull();
    expect(parseImageToolResult("null")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseImageToolResult("")).toBeNull();
  });

  it("includes storageId when present in JSON", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/image.png",
      caption: "A sunset",
      storageId: "kg2abc123def456",
    });
    expect(parseImageToolResult(json)).toEqual({
      imageUrl: "https://example.com/image.png",
      caption: "A sunset",
      storageId: "kg2abc123def456",
    });
  });

  it("omits storageId when not present in JSON", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/image.png",
      caption: "A sunset",
    });
    const result = parseImageToolResult(json);
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("storageId");
  });
});

describe("extractImageFromSteps", () => {
  const makeSteps = (
    toolResults: Array<Record<string, unknown>>
  ) => [{ toolResults }];

  it("extracts image from tool result output field", () => {
    const steps = makeSteps([
      {
        toolName: "generateImage",
        output: JSON.stringify({
          type: "image",
          imageUrl: "https://storage.convex.cloud/abc123",
          caption: "Dubai skyline at night",
        }),
      },
    ]);
    expect(extractImageFromSteps(steps)).toEqual({
      imageUrl: "https://storage.convex.cloud/abc123",
      caption: "Dubai skyline at night",
    });
  });

  it("extracts image from result field as fallback", () => {
    const steps = makeSteps([
      {
        toolName: "generateImage",
        result: JSON.stringify({
          type: "image",
          imageUrl: "https://storage.convex.cloud/xyz",
          caption: "A cat",
        }),
      },
    ]);
    expect(extractImageFromSteps(steps)).toEqual({
      imageUrl: "https://storage.convex.cloud/xyz",
      caption: "A cat",
    });
  });

  it("returns null when no image tool results", () => {
    const steps = makeSteps([
      { toolName: "updateMemory", output: "Memory updated." },
    ]);
    expect(extractImageFromSteps(steps)).toBeNull();
  });

  it("returns null for empty steps", () => {
    expect(extractImageFromSteps([])).toBeNull();
  });

  it("finds image in second step", () => {
    const steps = [
      { toolResults: [{ toolName: "webSearch", output: "some results" }] },
      {
        toolResults: [
          {
            toolName: "generateImage",
            output: JSON.stringify({
              type: "image",
              imageUrl: "https://example.com/img.png",
              caption: "Test",
            }),
          },
        ],
      },
    ];
    expect(extractImageFromSteps(steps)).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "Test",
    });
  });

  it("skips non-string tool results", () => {
    const steps = makeSteps([
      { toolName: "someOther", output: 42 },
      { toolName: "another", output: null },
    ]);
    expect(extractImageFromSteps(steps)).toBeNull();
  });

  it("propagates storageId from tool result", () => {
    const steps = makeSteps([
      {
        toolName: "generateImage",
        output: JSON.stringify({
          type: "image",
          imageUrl: "https://storage.convex.cloud/abc123",
          caption: "A motorbike",
          storageId: "kg2abc123def456",
        }),
      },
    ]);
    expect(extractImageFromSteps(steps)).toEqual({
      imageUrl: "https://storage.convex.cloud/abc123",
      caption: "A motorbike",
      storageId: "kg2abc123def456",
    });
  });
});

describe("parseConvertedFileResult", () => {
  it("parses valid conversion result", () => {
    const json = JSON.stringify({
      type: "conversion",
      fileUrl: "https://storage.convex.cloud/abc123",
      caption: "Here's your file converted to PDF.",
      outputFormat: "pdf",
    });
    expect(parseConvertedFileResult(json)).toEqual({
      fileUrl: "https://storage.convex.cloud/abc123",
      caption: "Here's your file converted to PDF.",
      outputFormat: "pdf",
    });
  });

  it("returns null for image type", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/img.png",
      caption: "test",
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for JSON without type discriminator", () => {
    const json = JSON.stringify({
      fileUrl: "https://example.com/file.pdf",
      caption: "Converted",
      outputFormat: "pdf",
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for JSON without outputFormat", () => {
    const json = JSON.stringify({
      type: "conversion",
      fileUrl: "https://example.com/file.pdf",
      caption: "Converted",
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for plain text", () => {
    expect(parseConvertedFileResult("Conversion failed")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseConvertedFileResult("")).toBeNull();
  });
});

describe("extractConvertedFileFromSteps", () => {
  const makeSteps = (
    toolResults: Array<Record<string, unknown>>
  ) => [{ toolResults }];

  it("extracts conversion from tool result output field", () => {
    const steps = makeSteps([
      {
        toolName: "convertFile",
        output: JSON.stringify({
          type: "conversion",
          fileUrl: "https://storage.convex.cloud/converted123",
          caption: "Here's your file converted to DOCX.",
          outputFormat: "docx",
        }),
      },
    ]);
    expect(extractConvertedFileFromSteps(steps)).toEqual({
      fileUrl: "https://storage.convex.cloud/converted123",
      caption: "Here's your file converted to DOCX.",
      outputFormat: "docx",
    });
  });

  it("returns null when no conversion tool results", () => {
    const steps = makeSteps([
      { toolName: "updateMemory", output: "Memory updated." },
    ]);
    expect(extractConvertedFileFromSteps(steps)).toBeNull();
  });

  it("returns null for empty steps", () => {
    expect(extractConvertedFileFromSteps([])).toBeNull();
  });

  it("ignores image results", () => {
    const steps = makeSteps([
      {
        toolName: "generateImage",
        output: JSON.stringify({
          type: "image",
          imageUrl: "https://example.com/img.png",
          caption: "A sunset",
        }),
      },
    ]);
    expect(extractConvertedFileFromSteps(steps)).toBeNull();
  });
});

describe("buildFileContextNote", () => {
  it("returns empty string when storageId is null", () => {
    expect(buildFileContextNote(null, true)).toBe("");
    expect(buildFileContextNote(null, false)).toBe("");
  });

  it("includes storageId in the note", () => {
    const note = buildFileContextNote("abc123", true);
    expect(note).toContain("abc123");
  });

  it("includes referenceImageStorageId hint for images", () => {
    const note = buildFileContextNote("abc123", true);
    expect(note).toContain("referenceImageStorageId");
  });

  it("includes style transfer examples for images (Ghibli, manga, oil painting)", () => {
    const note = buildFileContextNote("abc123", true);
    expect(note.toLowerCase()).toContain("ghibli");
    expect(note.toLowerCase()).toContain("manga");
    expect(note.toLowerCase()).toContain("oil painting");
  });

  it("does not include referenceImageStorageId hint for non-images", () => {
    const note = buildFileContextNote("abc123", false);
    expect(note).not.toContain("referenceImageStorageId");
  });

  it("includes convertFile hint for non-images", () => {
    const note = buildFileContextNote("abc123", false);
    expect(note).toContain("convertFile");
  });

  it("includes both convertFile and referenceImageStorageId for images", () => {
    const note = buildFileContextNote("abc123", true);
    expect(note).toContain("convertFile");
    expect(note).toContain("referenceImageStorageId");
  });

  it("starts with a newline", () => {
    const note = buildFileContextNote("abc123", true);
    expect(note).toMatch(/^\n/);
  });
});
