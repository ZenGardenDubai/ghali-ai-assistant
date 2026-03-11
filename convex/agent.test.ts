import { describe, it, expect } from "vitest";
import { formatWebSearchResult } from "./agent";

describe("formatWebSearchResult", () => {
  it("prefixes result with the search query label", () => {
    const result = formatWebSearchResult("UAE AI strategy", "Some result text.");
    expect(result).toBe('[Web search: "UAE AI strategy"]\n\nSome result text.');
  });

  it("preserves multi-line result text", () => {
    const result = formatWebSearchResult("query", "Line 1\nLine 2\nLine 3");
    expect(result).toBe('[Web search: "query"]\n\nLine 1\nLine 2\nLine 3');
  });

  it("handles empty result text", () => {
    const result = formatWebSearchResult("empty search", "");
    expect(result).toBe('[Web search: "empty search"]\n\n');
  });
});
