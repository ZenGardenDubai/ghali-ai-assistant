import { describe, it, expect } from "vitest";
import {
  extractHashtags,
  truncateTweet,
  buildTweetPrompt,
} from "./contentStudio";

describe("extractHashtags", () => {
  it("extracts hashtags from a tweet", () => {
    expect(extractHashtags("Hello world #AI #WhatsApp")).toEqual(["#AI", "#WhatsApp"]);
  });

  it("returns empty array when no hashtags", () => {
    expect(extractHashtags("No hashtags here")).toEqual([]);
  });

  it("deduplicates hashtags", () => {
    expect(extractHashtags("#AI built with #AI power")).toEqual(["#AI"]);
  });

  it("handles mixed case hashtags", () => {
    const tags = extractHashtags("#AI #WhatsApp #productivity");
    expect(tags).toHaveLength(3);
    expect(tags).toContain("#AI");
    expect(tags).toContain("#WhatsApp");
    expect(tags).toContain("#productivity");
  });
});

describe("truncateTweet", () => {
  it("returns tweet unchanged if under limit", () => {
    const tweet = "Short tweet #AI";
    expect(truncateTweet(tweet)).toBe(tweet);
  });

  it("truncates tweet at 280 chars with ellipsis", () => {
    const long = "a".repeat(300);
    const result = truncateTweet(long);
    expect(result.length).toBe(280);
    expect(result.endsWith("…")).toBe(true);
  });

  it("uses custom limit", () => {
    const tweet = "Hello world";
    const result = truncateTweet(tweet, 7);
    expect(result.length).toBe(7);
    expect(result).toBe("Hello …");
  });

  it("returns exact 280-char string unchanged", () => {
    const tweet = "a".repeat(280);
    expect(truncateTweet(tweet)).toBe(tweet);
    expect(truncateTweet(tweet).length).toBe(280);
  });
});

describe("buildTweetPrompt", () => {
  it("includes feature title and description", () => {
    const prompt = buildTweetPrompt("Smart Calendar", "Ghali now integrates with Google Calendar", "informative", []);
    expect(prompt).toContain("Smart Calendar");
    expect(prompt).toContain("Ghali now integrates with Google Calendar");
  });

  it("includes tone instructions", () => {
    const infPrompt = buildTweetPrompt("Feature", "Desc", "informative", []);
    const casualPrompt = buildTweetPrompt("Feature", "Desc", "casual", []);
    const punchyPrompt = buildTweetPrompt("Feature", "Desc", "punchy", []);

    expect(infPrompt).toContain("professional");
    expect(casualPrompt).toContain("conversational");
    expect(punchyPrompt).toContain("punchy");
  });

  it("includes provided hashtags", () => {
    const prompt = buildTweetPrompt("Feature", "Desc", "casual", ["#AI", "#WhatsApp"]);
    expect(prompt).toContain("#AI");
    expect(prompt).toContain("#WhatsApp");
  });

  it("falls back to default hashtag hint when none provided", () => {
    const prompt = buildTweetPrompt("Feature", "Desc", "punchy", []);
    expect(prompt).toContain("#AI");
    expect(prompt).toContain("#Productivity");
  });

  it("requests exactly 3 tweet variants", () => {
    const prompt = buildTweetPrompt("Feature", "Desc", "informative", []);
    expect(prompt).toContain("exactly 3");
  });

  it("specifies 280 character limit", () => {
    const prompt = buildTweetPrompt("Feature", "Desc", "informative", []);
    expect(prompt).toContain("280");
  });

  it("requests JSON array output", () => {
    const prompt = buildTweetPrompt("Feature", "Desc", "informative", []);
    expect(prompt).toContain("JSON array");
  });
});
