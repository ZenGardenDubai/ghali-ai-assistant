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

  it("escapes double quotes in query", () => {
    const result = formatWebSearchResult('test "injection" here', "Results.");
    expect(result).toBe('[Web search: "test \\"injection\\" here"]\n\nResults.');
  });

  it("replaces newlines in query with spaces", () => {
    const result = formatWebSearchResult("line1\nline2\rline3", "Results.");
    expect(result).toBe('[Web search: "line1 line2 line3"]\n\nResults.');
  });

  it("trims whitespace from query", () => {
    const result = formatWebSearchResult("  padded query  ", "Results.");
    expect(result).toBe('[Web search: "padded query"]\n\nResults.');
  });
});
