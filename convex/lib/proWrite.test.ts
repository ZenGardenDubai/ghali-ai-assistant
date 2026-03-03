import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildBriefPrompt,
  buildEnrichPrompt,
  buildResearchQuery,
  buildRagQuery,
  buildSynthesizePrompt,
  buildDraftPrompt,
  buildElevatePrompt,
  buildRefinePrompt,
  buildHumanizePrompt,
  parseBriefOutput,
  formatProWriteResult,
  isOpusOverloaded,
  withOpusRetry,
} from "./proWrite";

// ---------------------------------------------------------------------------
// Prompt builders — all should return non-empty system + user strings
// ---------------------------------------------------------------------------

describe("buildBriefPrompt", () => {
  it("returns system and user prompts with input embedded", () => {
    const result = buildBriefPrompt("Write a LinkedIn post about AI trends");
    expect(result.system).toContain("creative brief");
    expect(result.system).toContain("JSON");
    expect(result.user).toBe("Write a LinkedIn post about AI trends");
  });

  it("handles empty input", () => {
    const result = buildBriefPrompt("");
    expect(result.system.length).toBeGreaterThan(0);
    expect(result.user).toBe("");
  });
});

describe("buildEnrichPrompt", () => {
  it("includes brief and answers in user prompt", () => {
    const result = buildEnrichPrompt("Brief about AI", "Target: engineers");
    expect(result.user).toContain("Brief about AI");
    expect(result.user).toContain("Target: engineers");
    expect(result.system).toContain("enriched brief");
  });
});

describe("buildResearchQuery", () => {
  it("extracts topic from first line of brief", () => {
    const query = buildResearchQuery("AI trends in healthcare\nMore details here");
    expect(query).toContain("AI trends in healthcare");
    expect(query).toContain("latest facts");
  });

  it("truncates long briefs", () => {
    const longLine = "a".repeat(300);
    const query = buildResearchQuery(longLine);
    expect(query.length).toBeLessThan(300);
  });

  it("handles empty brief", () => {
    const query = buildResearchQuery("");
    expect(query).toContain("latest facts");
  });
});

describe("buildRagQuery", () => {
  it("returns first line of brief as query", () => {
    const query = buildRagQuery("AI trends in healthcare\nMore details");
    expect(query).toBe("AI trends in healthcare");
  });

  it("truncates long briefs to 200 chars", () => {
    const longLine = "a".repeat(300);
    const query = buildRagQuery(longLine);
    expect(query.length).toBe(200);
  });
});

describe("buildSynthesizePrompt", () => {
  it("includes brief, research, and rag in user prompt", () => {
    const result = buildSynthesizePrompt("Brief", "Research data", "RAG data");
    expect(result.user).toContain("Brief");
    expect(result.user).toContain("Research data");
    expect(result.user).toContain("RAG data");
    expect(result.system).toContain("outline");
  });

  it("handles empty research and rag", () => {
    const result = buildSynthesizePrompt("Brief", "", "");
    expect(result.user).toContain("No research available");
    expect(result.user).toContain("No relevant documents found");
  });
});

describe("buildDraftPrompt", () => {
  it("passes synthesis as user prompt", () => {
    const result = buildDraftPrompt("Outline here");
    expect(result.user).toBe("Outline here");
    expect(result.system).toContain("ghostwriter");
  });
});

describe("buildElevatePrompt", () => {
  it("passes draft as user prompt", () => {
    const result = buildElevatePrompt("Draft text");
    expect(result.user).toBe("Draft text");
    expect(result.system).toContain("elevate");
  });
});

describe("buildRefinePrompt", () => {
  it("passes elevated text as user prompt", () => {
    const result = buildRefinePrompt("Elevated text");
    expect(result.user).toBe("Elevated text");
    expect(result.system).toContain("copy editor");
  });
});

describe("buildHumanizePrompt", () => {
  it("includes personality in system prompt", () => {
    const result = buildHumanizePrompt("Refined text", "Casual, witty tone");
    expect(result.system).toContain("Casual, witty tone");
    expect(result.user).toBe("Refined text");
  });

  it("uses default when personality is empty", () => {
    const result = buildHumanizePrompt("Refined text", "");
    expect(result.system).toContain("natural, conversational tone");
  });
});

// ---------------------------------------------------------------------------
// parseBriefOutput
// ---------------------------------------------------------------------------

describe("parseBriefOutput", () => {
  it("parses valid JSON output", () => {
    const raw = JSON.stringify({
      brief: "This is a brief",
      questions: ["Q1?", "Q2?", "Q3?"],
    });
    const result = parseBriefOutput(raw);
    expect(result.brief).toBe("This is a brief");
    expect(result.questions).toEqual(["Q1?", "Q2?", "Q3?"]);
  });

  it("parses JSON wrapped in code blocks", () => {
    const raw = '```json\n{"brief": "Brief text", "questions": ["Q1?"]}\n```';
    const result = parseBriefOutput(raw);
    expect(result.brief).toBe("Brief text");
    expect(result.questions).toEqual(["Q1?"]);
  });

  it("filters empty questions", () => {
    const raw = JSON.stringify({
      brief: "Brief",
      questions: ["Q1?", "", "  ", "Q2?"],
    });
    const result = parseBriefOutput(raw);
    expect(result.questions).toEqual(["Q1?", "Q2?"]);
  });

  it("falls back to heuristic parsing for non-JSON", () => {
    const raw = `This is the brief about AI.

Questions:
1. Who is the audience?
2. What tone do you prefer?`;
    const result = parseBriefOutput(raw);
    expect(result.brief).toContain("brief about AI");
    expect(result.questions.length).toBe(2);
    expect(result.questions[0]).toContain("audience?");
  });

  it("returns fallback for unparseable text", () => {
    const raw = "Just some random text without structure";
    const result = parseBriefOutput(raw);
    expect(result.brief).toBe("Just some random text without structure");
    expect(result.questions.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// formatProWriteResult
// ---------------------------------------------------------------------------

describe("formatProWriteResult", () => {
  it("wraps text with header", () => {
    const result = formatProWriteResult("My article text");
    expect(result).toContain("✍️ *ProWrite Result*");
    expect(result).toContain("My article text");
  });

  it("trims whitespace", () => {
    const result = formatProWriteResult("  text  ");
    expect(result).toContain("text");
    expect(result).not.toContain("  text  ");
  });
});

// ---------------------------------------------------------------------------
// isOpusOverloaded
// ---------------------------------------------------------------------------

describe("isOpusOverloaded", () => {
  it("returns true for Error with 'overloaded' in message", () => {
    expect(isOpusOverloaded(new Error("Anthropic: overloaded_error"))).toBe(true);
  });

  it("returns true for Error with '529' in message", () => {
    expect(isOpusOverloaded(new Error("Request failed with status 529"))).toBe(true);
  });

  it("returns true for Error with 'overload_error' in message", () => {
    expect(isOpusOverloaded(new Error("overload_error from upstream"))).toBe(true);
  });

  it("returns true for object with status 529", () => {
    expect(isOpusOverloaded({ status: 529 })).toBe(true);
  });

  it("returns true for object with overloaded type field", () => {
    expect(isOpusOverloaded({ type: "overloaded_error" })).toBe(true);
  });

  it("returns true when nested cause contains overloaded error", () => {
    expect(isOpusOverloaded({ cause: new Error("overloaded") })).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isOpusOverloaded(new Error("Network timeout"))).toBe(false);
    expect(isOpusOverloaded(new Error("Invalid API key"))).toBe(false);
    expect(isOpusOverloaded({ status: 500 })).toBe(false);
  });

  it("returns false for null and non-error values", () => {
    expect(isOpusOverloaded(null)).toBe(false);
    expect(isOpusOverloaded(undefined)).toBe(false);
    expect(isOpusOverloaded("overloaded")).toBe(false);
  });

  it("does not false-positive on '529' appearing as substring", () => {
    expect(isOpusOverloaded(new Error("token limit 1529 exceeded"))).toBe(false);
    expect(isOpusOverloaded(new Error("request id abc529def"))).toBe(false);
  });

  it("matches standalone 529 status codes in messages", () => {
    expect(isOpusOverloaded(new Error("status 529"))).toBe(true);
    expect(isOpusOverloaded(new Error("HTTP 529 overloaded"))).toBe(true);
  });

  it("traverses deeply nested cause chains", () => {
    const deep = { cause: { cause: { cause: new Error("overloaded") } } };
    expect(isOpusOverloaded(deep)).toBe(true);
  });

  it("stops recursion at depth limit and returns false", () => {
    // Build a cause chain deeper than 5
    let obj: Record<string, unknown> = { type: "overloaded_error" };
    for (let i = 0; i < 7; i++) {
      obj = { cause: obj };
    }
    expect(isOpusOverloaded(obj)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// withOpusRetry
// ---------------------------------------------------------------------------

describe("withOpusRetry", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns immediately on success (no retry)", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withOpusRetry("TEST", fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on overload error and eventually succeeds", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("overloaded"))
      .mockResolvedValue("recovered");
    const promise = withOpusRetry("TEST", fn, 2);
    await vi.advanceTimersByTimeAsync(2_000);
    const result = await promise;
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retries on overload", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("overloaded"));
    const promise = withOpusRetry("TEST", fn, 2).catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await promise;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe("overloaded");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("throws immediately on non-overload errors (no retry)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Invalid API key"));
    await expect(withOpusRetry("TEST", fn, 2)).rejects.toThrow("Invalid API key");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
