import { describe, it, expect } from "vitest";
import { parseImageToolResult, extractImageFromSteps } from "../messages";

describe("parseImageToolResult", () => {
  it("parses valid JSON with imageUrl and caption", () => {
    const json = JSON.stringify({
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
    const json = JSON.stringify({ caption: "A sunset" });
    expect(parseImageToolResult(json)).toBeNull();
  });

  it("returns null for JSON without caption", () => {
    const json = JSON.stringify({ imageUrl: "https://example.com/img.png" });
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
});
