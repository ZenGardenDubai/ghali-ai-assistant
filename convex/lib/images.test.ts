import { describe, it, expect } from "vitest";
import {
  parseImageToolResult,
  extractImageFromSteps,
  parseConvertedFileResult,
  extractConvertedFileFromSteps,
} from "../messages";
import { enhanceEditPrompt } from "./imagePrompts";

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

describe("enhanceEditPrompt", () => {
  it("expands ghibli to full style prompt", () => {
    const result = enhanceEditPrompt("Make ghibli");
    expect(result).toContain("Studio Ghibli anime style");
    expect(result).toContain("Preserve the subject's face, likeness, and appearance exactly");
    expect(result).toContain("Keep all other details (background, clothing, pose) consistent with the original");
  });

  it("handles Japanese ghibli script ジブリ", () => {
    const result = enhanceEditPrompt("ジブリスタイルに変換して");
    expect(result).toContain("Studio Ghibli anime style");
  });

  it("handles Arabic ghibli script جيبلي", () => {
    const result = enhanceEditPrompt("حوله إلى جيبلي");
    expect(result).toContain("Studio Ghibli anime style");
  });

  it("expands manga to full style prompt", () => {
    const result = enhanceEditPrompt("convert to manga");
    expect(result).toContain("manga comic art style");
    expect(result).toContain("High-contrast ink linework");
  });

  it("handles Arabic manga مانغا", () => {
    const result = enhanceEditPrompt("حوله إلى مانغا");
    expect(result).toContain("manga comic art style");
  });

  it("expands anime to full style prompt", () => {
    const result = enhanceEditPrompt("make it anime style");
    expect(result).toContain("vibrant anime illustration style");
    expect(result).toContain("cel-shaded colors");
  });

  it("expands pixar to full style prompt", () => {
    const result = enhanceEditPrompt("pixar style please");
    expect(result).toContain("Pixar/Disney 3D animation style");
  });

  it("expands disney to full style prompt", () => {
    const result = enhanceEditPrompt("make it disney");
    expect(result).toContain("Pixar/Disney 3D animation style");
  });

  it("expands watercolor to full style prompt", () => {
    const result = enhanceEditPrompt("watercolor effect");
    expect(result).toContain("watercolor painting style");
    expect(result).toContain("Delicate washes");
  });

  it("expands oil painting to full style prompt", () => {
    const result = enhanceEditPrompt("make it an oil painting");
    expect(result).toContain("classical oil painting style");
    expect(result).toContain("visible brushwork");
  });

  it("wraps unknown style with fallback template", () => {
    const result = enhanceEditPrompt("make it look like a Van Gogh");
    expect(result).toContain("Transform the image: make it look like a Van Gogh");
    expect(result).toContain("Preserve the subject's face, likeness, and appearance exactly");
    expect(result).toContain("Keep all other details (background, clothing, pose) consistent with the original");
  });

  it("is case-insensitive for style keywords", () => {
    expect(enhanceEditPrompt("GHIBLI style")).toContain("Studio Ghibli anime style");
    expect(enhanceEditPrompt("Manga")).toContain("manga comic art style");
    expect(enhanceEditPrompt("ANIME")).toContain("vibrant anime illustration style");
  });

  it("does not match 'anime' in 'inanimate'", () => {
    const result = enhanceEditPrompt("make it look inanimate");
    expect(result).toContain("Transform the image: make it look inanimate");
    expect(result).not.toContain("vibrant anime illustration style");
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
