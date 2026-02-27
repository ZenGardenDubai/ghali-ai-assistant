import { describe, it, expect } from "vitest";
import {
  isProWriteRequest,
  isSkipQuestionsRequest,
  extractProWriteContent,
  formatProWriteQuestions,
  buildPipelineStartMessage,
} from "./proWrite";

describe("isProWriteRequest", () => {
  it("returns true for messages starting with 'prowrite'", () => {
    expect(isProWriteRequest("prowrite a LinkedIn post about AI")).toBe(true);
    expect(isProWriteRequest("Prowrite an article about Dubai")).toBe(true);
    expect(isProWriteRequest("PROWRITE: blog post")).toBe(true);
  });

  it("returns false for regular messages", () => {
    expect(isProWriteRequest("write me an article")).toBe(false);
    expect(isProWriteRequest("help")).toBe(false);
    expect(isProWriteRequest("I want to prowrite something")).toBe(false);
  });

  it("handles leading whitespace", () => {
    expect(isProWriteRequest("  prowrite article")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isProWriteRequest("")).toBe(false);
  });
});

describe("isSkipQuestionsRequest", () => {
  it("returns true for skip variants", () => {
    expect(isSkipQuestionsRequest("skip questions")).toBe(true);
    expect(isSkipQuestionsRequest("just write it")).toBe(true);
    expect(isSkipQuestionsRequest("skip")).toBe(true);
    expect(isSkipQuestionsRequest("just write")).toBe(true);
    expect(isSkipQuestionsRequest("no questions please")).toBe(true);
    expect(isSkipQuestionsRequest("skip the questions")).toBe(true);
  });

  it("returns false for non-skip messages", () => {
    expect(isSkipQuestionsRequest("here are my answers")).toBe(false);
    expect(isSkipQuestionsRequest("yes")).toBe(false);
    expect(isSkipQuestionsRequest("use ZB data, make the closing bold")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isSkipQuestionsRequest("Skip Questions")).toBe(true);
    expect(isSkipQuestionsRequest("JUST WRITE IT")).toBe(true);
    expect(isSkipQuestionsRequest("NO QUESTIONS")).toBe(true);
  });
});

describe("extractProWriteContent", () => {
  it("extracts content after prowrite keyword", () => {
    expect(extractProWriteContent("prowrite a LinkedIn post about AI")).toBe(
      "a LinkedIn post about AI"
    );
  });

  it("handles colon separator", () => {
    expect(
      extractProWriteContent("prowrite: blog post about sustainability")
    ).toBe("blog post about sustainability");
  });

  it("handles dash separator", () => {
    expect(extractProWriteContent("prowrite - article about fintech")).toBe(
      "article about fintech"
    );
  });

  it("is case-insensitive for keyword", () => {
    expect(extractProWriteContent("PROWRITE an article about AI")).toBe(
      "an article about AI"
    );
  });

  it("returns full message if no prowrite keyword", () => {
    expect(extractProWriteContent("regular message")).toBe("regular message");
  });

  it("handles prowrite with word count spec", () => {
    expect(
      extractProWriteContent("prowrite a LinkedIn post about AI in government, 500 words")
    ).toBe("a LinkedIn post about AI in government, 500 words");
  });
});

describe("formatProWriteQuestions", () => {
  it("formats questions with brief summary", () => {
    const result = formatProWriteQuestions("A LinkedIn post about AI", [
      "What's your main point?",
      "Any stats to include?",
    ]);
    expect(result).toContain("*Here's what I'm thinking:*");
    expect(result).toContain("A LinkedIn post about AI");
    expect(result).toContain("1. What's your main point?");
    expect(result).toContain("2. Any stats to include?");
    expect(result).toContain("skip questions");
  });

  it("handles empty questions array", () => {
    const result = formatProWriteQuestions("A blog post", []);
    expect(result).toContain("A blog post");
    expect(result).toContain("Ready to write!");
    expect(result).not.toContain("skip questions");
  });

  it("numbers questions sequentially", () => {
    const result = formatProWriteQuestions("Brief", ["Q1", "Q2", "Q3"]);
    expect(result).toContain("1. Q1");
    expect(result).toContain("2. Q2");
    expect(result).toContain("3. Q3");
  });
});

describe("buildPipelineStartMessage", () => {
  it("returns the pipeline start message with timing", () => {
    const msg = buildPipelineStartMessage();
    expect(msg).toContain("3-4 minutes");
    expect(msg).toContain("pipeline");
    expect(msg).toContain("✍️");
  });

  it("mentions article delivery", () => {
    const msg = buildPipelineStartMessage();
    expect(msg).toContain("article");
  });
});
