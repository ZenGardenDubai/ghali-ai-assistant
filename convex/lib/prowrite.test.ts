import { describe, expect, it } from "vitest";
import {
  detectProWriteTrigger,
  buildBriefSystemPrompt,
  buildHumanizeSystemPrompt,
  PROWRITE_TRIGGER_PATTERNS,
} from "./prowrite";

describe("detectProWriteTrigger", () => {
  describe("true positives — should detect ProWrite requests", () => {
    it("detects 'write me a LinkedIn post about X'", () => {
      expect(detectProWriteTrigger("write me a LinkedIn post about AI in government")).toBe(true);
    });

    it("detects 'draft a LinkedIn article on X'", () => {
      expect(detectProWriteTrigger("draft a LinkedIn article on digital transformation")).toBe(true);
    });

    it("detects explicit prowrite: prefix", () => {
      expect(detectProWriteTrigger("prowrite: LinkedIn post about AI")).toBe(true);
    });

    it("detects ProWrite: prefix with different capitalisation", () => {
      expect(detectProWriteTrigger("ProWrite: article about startups")).toBe(true);
    });

    it("detects 'help me write about X'", () => {
      expect(detectProWriteTrigger("help me write about blockchain")).toBe(true);
    });

    it("detects 'write me an article about X'", () => {
      expect(detectProWriteTrigger("write me an article about the future of work")).toBe(true);
    });

    it("detects 'draft an essay on X'", () => {
      expect(detectProWriteTrigger("draft an essay on leadership")).toBe(true);
    });

    it("detects newsletter requests", () => {
      expect(detectProWriteTrigger("write a newsletter about our Q1 results")).toBe(true);
    });

    it("detects blog post requests", () => {
      expect(detectProWriteTrigger("write a blog post about productivity tips")).toBe(true);
    });

    it("detects 'write a post about X'", () => {
      expect(detectProWriteTrigger("write a post about why government forms should disappear, 400 words")).toBe(true);
    });

    it("detects 'compose a newsletter'", () => {
      expect(detectProWriteTrigger("compose a newsletter for our team")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(detectProWriteTrigger("WRITE ME A POST ABOUT X")).toBe(true);
      expect(detectProWriteTrigger("Draft An Article On Technology")).toBe(true);
      expect(detectProWriteTrigger("HELP ME WRITE about leadership")).toBe(true);
    });

    it("detects email writing requests", () => {
      expect(detectProWriteTrigger("write me an email to our investors")).toBe(true);
    });
  });

  describe("true negatives — should NOT detect non-ProWrite messages", () => {
    it("ignores weather questions", () => {
      expect(detectProWriteTrigger("what's the weather?")).toBe(false);
    });

    it("ignores reminder requests", () => {
      expect(detectProWriteTrigger("remind me at 5pm")).toBe(false);
    });

    it("ignores greetings", () => {
      expect(detectProWriteTrigger("how are you?")).toBe(false);
    });

    it("ignores code requests (code ≠ article/post)", () => {
      expect(detectProWriteTrigger("write me some code to parse JSON")).toBe(false);
    });

    it("ignores generic questions", () => {
      expect(detectProWriteTrigger("can you explain machine learning?")).toBe(false);
    });

    it("ignores save note requests", () => {
      expect(detectProWriteTrigger("save a note about my meeting")).toBe(false);
    });

    it("ignores translation requests", () => {
      expect(detectProWriteTrigger("translate this document to French")).toBe(false);
    });
  });

  describe("PROWRITE_TRIGGER_PATTERNS is an array of RegExps", () => {
    it("exports a non-empty patterns array", () => {
      expect(Array.isArray(PROWRITE_TRIGGER_PATTERNS)).toBe(true);
      expect(PROWRITE_TRIGGER_PATTERNS.length).toBeGreaterThan(0);
    });

    it("all entries are RegExp instances", () => {
      for (const pattern of PROWRITE_TRIGGER_PATTERNS) {
        expect(pattern).toBeInstanceOf(RegExp);
      }
    });
  });
});

describe("buildBriefSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildBriefSystemPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("instructs the model to output JSON", () => {
    const prompt = buildBriefSystemPrompt();
    expect(prompt.toLowerCase()).toContain("json");
  });

  it("mentions key brief fields", () => {
    const prompt = buildBriefSystemPrompt();
    expect(prompt).toContain("topic");
    expect(prompt).toContain("audience");
    expect(prompt).toContain("tone");
  });
});

describe("buildHumanizeSystemPrompt", () => {
  it("includes the voice profile when provided", () => {
    const profile = "prefers short sentences, avoids jargon, direct tone";
    const prompt = buildHumanizeSystemPrompt(profile);
    expect(prompt).toContain(profile);
  });

  it("has a fallback message when no voice profile is provided", () => {
    const prompt = buildHumanizeSystemPrompt("");
    expect(prompt).toContain("No specific voice profile");
  });

  it("mentions removing AI artifacts", () => {
    const prompt = buildHumanizeSystemPrompt("some voice");
    expect(prompt.toLowerCase()).toContain("ai");
  });
});
