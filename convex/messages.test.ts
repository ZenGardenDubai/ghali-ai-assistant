import { describe, it, expect } from "vitest";
import {
  parseImageToolResult,
  parseConvertedFileResult,
  extractImageFromSteps,
  extractConvertedFileFromSteps,
} from "./messages";

// ============================================================================
// parseImageToolResult
// ============================================================================

describe("parseImageToolResult", () => {
  it("parses valid image tool result with type, imageUrl, and caption", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/image.png",
      caption: "A beautiful landscape",
    });
    const result = parseImageToolResult(json);
    expect(result).toEqual({
      imageUrl: "https://example.com/image.png",
      caption: "A beautiful landscape",
    });
  });

  it("returns null for missing type field", () => {
    const json = JSON.stringify({
      imageUrl: "https://example.com/image.png",
      caption: "No type field",
    });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for wrong type value", () => {
    const json = JSON.stringify({
      type: "conversion",
      imageUrl: "https://example.com/image.png",
      caption: "Wrong type",
    });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for missing imageUrl", () => {
    const json = JSON.stringify({
      type: "image",
      caption: "Missing URL",
    });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for missing caption", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/image.png",
    });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for non-string imageUrl", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: 12345,
      caption: "Invalid URL type",
    });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for non-string caption", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/image.png",
      caption: 12345,
    });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseImageToolResult("not valid json")).toBeNull();
  });

  it("returns null for non-object JSON", () => {
    expect(parseImageToolResult('"a string"')).toBeNull();
    expect(parseImageToolResult("123")).toBeNull();
    expect(parseImageToolResult("null")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseImageToolResult("")).toBeNull();
  });

  it("handles extra fields gracefully", () => {
    const json = JSON.stringify({
      type: "image",
      imageUrl: "https://example.com/image.png",
      caption: "Valid result",
      extraField: "ignored",
    });
    const result = parseImageToolResult(json);
    expect(result).toEqual({
      imageUrl: "https://example.com/image.png",
      caption: "Valid result",
    });
  });
});

// ============================================================================
// parseConvertedFileResult
// ============================================================================

describe("parseConvertedFileResult", () => {
  it("parses valid conversion result with type, fileUrl, caption, and outputFormat", () => {
    const json = JSON.stringify({
      type: "conversion",
      fileUrl: "https://example.com/file.pdf",
      caption: "Converted to PDF",
      outputFormat: "pdf",
    });
    const result = parseConvertedFileResult(json);
    expect(result).toEqual({
      fileUrl: "https://example.com/file.pdf",
      caption: "Converted to PDF",
      outputFormat: "pdf",
    });
  });

  it("returns null for missing type field", () => {
    const json = JSON.stringify({
      fileUrl: "https://example.com/file.pdf",
      caption: "No type",
      outputFormat: "pdf",
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for wrong type value", () => {
    const json = JSON.stringify({
      type: "image",
      fileUrl: "https://example.com/file.pdf",
      caption: "Wrong type",
      outputFormat: "pdf",
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for missing fileUrl", () => {
    const json = JSON.stringify({
      type: "conversion",
      caption: "Missing URL",
      outputFormat: "pdf",
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for missing caption", () => {
    const json = JSON.stringify({
      type: "conversion",
      fileUrl: "https://example.com/file.pdf",
      outputFormat: "pdf",
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for missing outputFormat", () => {
    const json = JSON.stringify({
      type: "conversion",
      fileUrl: "https://example.com/file.pdf",
      caption: "Missing format",
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for non-string fileUrl", () => {
    const json = JSON.stringify({
      type: "conversion",
      fileUrl: 12345,
      caption: "Invalid URL type",
      outputFormat: "pdf",
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for non-string caption", () => {
    const json = JSON.stringify({
      type: "conversion",
      fileUrl: "https://example.com/file.pdf",
      caption: 12345,
      outputFormat: "pdf",
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for non-string outputFormat", () => {
    const json = JSON.stringify({
      type: "conversion",
      fileUrl: "https://example.com/file.pdf",
      caption: "Invalid format type",
      outputFormat: 123,
    });
    expect(parseConvertedFileResult(json)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseConvertedFileResult("not valid json")).toBeNull();
  });

  it("returns null for non-object JSON", () => {
    expect(parseConvertedFileResult('"a string"')).toBeNull();
    expect(parseConvertedFileResult("123")).toBeNull();
    expect(parseConvertedFileResult("null")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseConvertedFileResult("")).toBeNull();
  });

  it("handles various output formats", () => {
    const formats = ["pdf", "docx", "png", "jpg", "csv"];
    for (const format of formats) {
      const json = JSON.stringify({
        type: "conversion",
        fileUrl: `https://example.com/file.${format}`,
        caption: `Converted to ${format.toUpperCase()}`,
        outputFormat: format,
      });
      const result = parseConvertedFileResult(json);
      expect(result?.outputFormat).toBe(format);
    }
  });
});

// ============================================================================
// extractImageFromSteps
// ============================================================================

describe("extractImageFromSteps", () => {
  it("extracts image result from tool results using output field", () => {
    const steps = [
      {
        toolResults: [
          {
            output: JSON.stringify({
              type: "image",
              imageUrl: "https://example.com/img.png",
              caption: "Generated image",
            }),
          },
        ],
      },
    ];
    const result = extractImageFromSteps(steps);
    expect(result).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "Generated image",
    });
  });

  it("extracts image result from tool results using result field (fallback)", () => {
    const steps = [
      {
        toolResults: [
          {
            result: JSON.stringify({
              type: "image",
              imageUrl: "https://example.com/img.png",
              caption: "Generated image",
            }),
          },
        ],
      },
    ];
    const result = extractImageFromSteps(steps);
    expect(result).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "Generated image",
    });
  });

  it("prefers output field over result field when both present", () => {
    const steps = [
      {
        toolResults: [
          {
            output: JSON.stringify({
              type: "image",
              imageUrl: "https://example.com/output.png",
              caption: "From output",
            }),
            result: JSON.stringify({
              type: "image",
              imageUrl: "https://example.com/result.png",
              caption: "From result",
            }),
          },
        ],
      },
    ];
    const result = extractImageFromSteps(steps);
    expect(result).toEqual({
      imageUrl: "https://example.com/output.png",
      caption: "From output",
    });
  });

  it("returns null when no image results found", () => {
    const steps = [
      {
        toolResults: [
          {
            output: "No JSON here",
          },
        ],
      },
    ];
    expect(extractImageFromSteps(steps)).toBeNull();
  });

  it("returns null for empty steps array", () => {
    expect(extractImageFromSteps([])).toBeNull();
  });

  it("returns null when toolResults are empty", () => {
    const steps = [{ toolResults: [] }];
    expect(extractImageFromSteps(steps)).toBeNull();
  });

  it("returns first matching image result from multiple steps", () => {
    const steps = [
      {
        toolResults: [
          { output: "Not an image" },
          {
            output: JSON.stringify({
              type: "image",
              imageUrl: "https://example.com/first.png",
              caption: "First image",
            }),
          },
        ],
      },
      {
        toolResults: [
          {
            output: JSON.stringify({
              type: "image",
              imageUrl: "https://example.com/second.png",
              caption: "Second image",
            }),
          },
        ],
      },
    ];
    const result = extractImageFromSteps(steps);
    expect(result).toEqual({
      imageUrl: "https://example.com/first.png",
      caption: "First image",
    });
  });

  it("skips non-string tool results", () => {
    const steps = [
      {
        toolResults: [
          { output: 12345 },
          { output: null },
          {
            output: JSON.stringify({
              type: "image",
              imageUrl: "https://example.com/img.png",
              caption: "Valid after invalid",
            }),
          },
        ],
      },
    ];
    const result = extractImageFromSteps(steps);
    expect(result).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "Valid after invalid",
    });
  });

  it("skips invalid JSON in tool results", () => {
    const steps = [
      {
        toolResults: [
          { output: "not valid json" },
          {
            output: JSON.stringify({
              type: "image",
              imageUrl: "https://example.com/img.png",
              caption: "Valid after invalid JSON",
            }),
          },
        ],
      },
    ];
    const result = extractImageFromSteps(steps);
    expect(result).toEqual({
      imageUrl: "https://example.com/img.png",
      caption: "Valid after invalid JSON",
    });
  });
});

// ============================================================================
// extractConvertedFileFromSteps
// ============================================================================

describe("extractConvertedFileFromSteps", () => {
  it("extracts conversion result from tool results using output field", () => {
    const steps = [
      {
        toolResults: [
          {
            output: JSON.stringify({
              type: "conversion",
              fileUrl: "https://example.com/file.pdf",
              caption: "Converted file",
              outputFormat: "pdf",
            }),
          },
        ],
      },
    ];
    const result = extractConvertedFileFromSteps(steps);
    expect(result).toEqual({
      fileUrl: "https://example.com/file.pdf",
      caption: "Converted file",
      outputFormat: "pdf",
    });
  });

  it("extracts conversion result from tool results using result field (fallback)", () => {
    const steps = [
      {
        toolResults: [
          {
            result: JSON.stringify({
              type: "conversion",
              fileUrl: "https://example.com/file.pdf",
              caption: "Converted file",
              outputFormat: "pdf",
            }),
          },
        ],
      },
    ];
    const result = extractConvertedFileFromSteps(steps);
    expect(result).toEqual({
      fileUrl: "https://example.com/file.pdf",
      caption: "Converted file",
      outputFormat: "pdf",
    });
  });

  it("returns null when no conversion results found", () => {
    const steps = [
      {
        toolResults: [
          {
            output: "No conversion here",
          },
        ],
      },
    ];
    expect(extractConvertedFileFromSteps(steps)).toBeNull();
  });

  it("returns null for empty steps array", () => {
    expect(extractConvertedFileFromSteps([])).toBeNull();
  });

  it("returns null when toolResults are empty", () => {
    const steps = [{ toolResults: [] }];
    expect(extractConvertedFileFromSteps(steps)).toBeNull();
  });

  it("returns first matching conversion result from multiple steps", () => {
    const steps = [
      {
        toolResults: [
          { output: "Not a conversion" },
          {
            output: JSON.stringify({
              type: "conversion",
              fileUrl: "https://example.com/first.pdf",
              caption: "First conversion",
              outputFormat: "pdf",
            }),
          },
        ],
      },
      {
        toolResults: [
          {
            output: JSON.stringify({
              type: "conversion",
              fileUrl: "https://example.com/second.docx",
              caption: "Second conversion",
              outputFormat: "docx",
            }),
          },
        ],
      },
    ];
    const result = extractConvertedFileFromSteps(steps);
    expect(result).toEqual({
      fileUrl: "https://example.com/first.pdf",
      caption: "First conversion",
      outputFormat: "pdf",
    });
  });

  it("skips non-string tool results", () => {
    const steps = [
      {
        toolResults: [
          { output: 12345 },
          { output: null },
          {
            output: JSON.stringify({
              type: "conversion",
              fileUrl: "https://example.com/file.pdf",
              caption: "Valid after invalid",
              outputFormat: "pdf",
            }),
          },
        ],
      },
    ];
    const result = extractConvertedFileFromSteps(steps);
    expect(result).toEqual({
      fileUrl: "https://example.com/file.pdf",
      caption: "Valid after invalid",
      outputFormat: "pdf",
    });
  });

  it("skips image results and finds conversion results", () => {
    const steps = [
      {
        toolResults: [
          {
            output: JSON.stringify({
              type: "image",
              imageUrl: "https://example.com/img.png",
              caption: "An image",
            }),
          },
          {
            output: JSON.stringify({
              type: "conversion",
              fileUrl: "https://example.com/file.pdf",
              caption: "A conversion",
              outputFormat: "pdf",
            }),
          },
        ],
      },
    ];
    const result = extractConvertedFileFromSteps(steps);
    expect(result).toEqual({
      fileUrl: "https://example.com/file.pdf",
      caption: "A conversion",
      outputFormat: "pdf",
    });
  });

  it("handles multiple output formats correctly", () => {
    const formats = ["pdf", "docx", "png", "jpg", "csv"];
    for (const format of formats) {
      const steps = [
        {
          toolResults: [
            {
              output: JSON.stringify({
                type: "conversion",
                fileUrl: `https://example.com/file.${format}`,
                caption: `Converted to ${format}`,
                outputFormat: format,
              }),
            },
          ],
        },
      ];
      const result = extractConvertedFileFromSteps(steps);
      expect(result?.outputFormat).toBe(format);
    }
  });
});