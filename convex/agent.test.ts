import { describe, it, expect } from "vitest";
import { formatWebSearchResult, pickChatThread } from "./agent";
import { REFLECTION_THREAD_TITLE } from "./constants";

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

describe("pickChatThread", () => {
  it("returns null for an empty thread list", () => {
    expect(pickChatThread([])).toBeNull();
  });

  it("returns the _id of the first non-reflection thread", () => {
    const threads = [
      { _id: "thread1", title: undefined },
      { _id: "thread2", title: "some chat" },
    ];
    expect(pickChatThread(threads)).toBe("thread1");
  });

  it("skips reflection threads and returns the next chat thread", () => {
    const threads = [
      { _id: "reflect1", title: REFLECTION_THREAD_TITLE },
      { _id: "reflect2", title: REFLECTION_THREAD_TITLE },
      { _id: "chat1", title: undefined },
    ];
    expect(pickChatThread(threads)).toBe("chat1");
  });

  it("returns null when all threads are reflection threads", () => {
    const threads = [
      { _id: "reflect1", title: REFLECTION_THREAD_TITLE },
      { _id: "reflect2", title: REFLECTION_THREAD_TITLE },
    ];
    expect(pickChatThread(threads)).toBeNull();
  });

  it("returns the most recent chat thread (first element) when multiple exist", () => {
    const threads = [
      { _id: "newest", title: undefined },
      { _id: "older", title: undefined },
      { _id: "oldest", title: undefined },
    ];
    expect(pickChatThread(threads)).toBe("newest");
  });

  it("handles threads with a non-reflection title correctly", () => {
    const threads = [
      { _id: "thread1", title: "My Chat" },
    ];
    expect(pickChatThread(threads)).toBe("thread1");
  });
});
