import { describe, it, expect } from "vitest";
import { formatWebSearchResult } from "./agent";

describe("formatWebSearchResult", () => {
  it("prefixes result with the search query label", () => {
    const result = formatWebSearchResult("UAE AI strategy for 2026", "Some result text.");
    expect(result).toMatch(/^\[Web search: "UAE AI strategy for 2026"\]/);
  });

  it("includes the result text after the label", () => {
    const result = formatWebSearchResult("weather in Dubai", "Sunny, 35°C.");
    expect(result).toContain("Sunny, 35°C.");
  });

  it("separates the label from the result with a blank line", () => {
    const result = formatWebSearchResult("GITEX 2026 dates", "GITEX 2026 will be held in October.");
    expect(result).toBe('[Web search: "GITEX 2026 dates"]\n\nGITEX 2026 will be held in October.');
  });

  it("handles multi-line result text", () => {
    const multiLineText = "Line 1\nLine 2\nLine 3";
    const result = formatWebSearchResult("my query", multiLineText);
    expect(result).toBe('[Web search: "my query"]\n\nLine 1\nLine 2\nLine 3');
  });

  it("handles empty result text", () => {
    const result = formatWebSearchResult("empty search", "");
    expect(result).toBe('[Web search: "empty search"]\n\n');
  });
});
