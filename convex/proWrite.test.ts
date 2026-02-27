import { describe, it, expect } from "vitest";
import {
  isProWriteRequest,
  extractKeywordsFromBrief,
  formatArticleForWhatsApp,
} from "./lib/proWrite";

describe("isProWriteRequest", () => {
  it("detects prowrite keyword at start (lowercase)", () => {
    expect(isProWriteRequest("prowrite a LinkedIn post about AI")).toBe(true);
  });

  it("detects prowrite keyword at start (mixed case)", () => {
    expect(isProWriteRequest("ProWrite a blog post")).toBe(true);
    expect(isProWriteRequest("PROWRITE something")).toBe(true);
  });

  it("ignores leading whitespace", () => {
    expect(isProWriteRequest("  prowrite a post")).toBe(true);
  });

  it("returns false when prowrite is not at the start", () => {
    expect(isProWriteRequest("can you prowrite something")).toBe(false);
    expect(isProWriteRequest("please prowrite a post")).toBe(false);
    expect(isProWriteRequest("write a post")).toBe(false);
  });

  it("returns false for empty and whitespace-only input", () => {
    expect(isProWriteRequest("")).toBe(false);
    expect(isProWriteRequest("   ")).toBe(false);
  });

  it("requires word boundary after prowrite", () => {
    expect(isProWriteRequest("prowriter")).toBe(false);
    expect(isProWriteRequest("prowriting")).toBe(false);
  });

  it("matches prowrite followed by a space", () => {
    expect(isProWriteRequest("prowrite: a LinkedIn post")).toBe(true);
  });
});

describe("extractKeywordsFromBrief", () => {
  it("extracts meaningful words from a brief", () => {
    const brief =
      "Topic: AI in government. Platform: LinkedIn. Audience: tech professionals. Tone: professional and direct.";
    const keywords = extractKeywordsFromBrief(brief);
    expect(keywords).toContain("LinkedIn");
    expect(keywords).toContain("government");
    expect(keywords).toContain("professionals");
  });

  it("filters out short words (≤3 chars)", () => {
    const brief = "the art of AI and its use in the world";
    const keywords = extractKeywordsFromBrief(brief);
    expect(keywords).not.toContain(" the ");
    expect(keywords).not.toContain(" and ");
  });

  it("deduplicates repeated words", () => {
    const brief = "government government government AI AI";
    const keywords = extractKeywordsFromBrief(brief);
    const wordList = keywords.split(" ").filter(Boolean);
    const uniqueWords = new Set(wordList);
    expect(wordList.length).toBe(uniqueWords.size);
  });

  it("returns empty string for empty input", () => {
    expect(extractKeywordsFromBrief("")).toBe("");
  });

  it("limits to 20 words", () => {
    const brief = "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22";
    const keywords = extractKeywordsFromBrief(brief);
    const wordCount = keywords.split(" ").filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(20);
  });
});

describe("formatArticleForWhatsApp", () => {
  it("trims leading and trailing whitespace", () => {
    expect(formatArticleForWhatsApp("  hello world  ")).toBe("hello world");
  });

  it("trims leading newlines", () => {
    expect(formatArticleForWhatsApp("\n\nArticle content\n")).toBe("Article content");
  });

  it("returns empty string for empty input", () => {
    expect(formatArticleForWhatsApp("")).toBe("");
  });

  it("preserves internal content unchanged", () => {
    const article = "First paragraph.\n\nSecond paragraph.";
    expect(formatArticleForWhatsApp(article)).toBe(article);
  });
});
