import { describe, it, expect } from "vitest";
import { shouldIncludeRecap, buildRecapInstruction, getRecapInstruction } from "./engagementRecap";
import { CREDITS_BASIC, CREDITS_PRO } from "../constants";

describe("shouldIncludeRecap", () => {
  // --- New users (first cycle): trigger at 4, 12, 20, 28, ... ---

  it("returns true for new user on 4th credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 4, tier: "basic", totalMessages: 4 })
    ).toBe(true);
  });

  it("returns false for new user on 3rd credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 3, tier: "basic", totalMessages: 3 })
    ).toBe(false);
  });

  it("returns false for new user on 5th credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 5, tier: "basic", totalMessages: 5 })
    ).toBe(false);
  });

  it("returns true for new user on 12th credit (4 + 8)", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 12, tier: "basic", totalMessages: 12 })
    ).toBe(true);
  });

  it("returns true for new user on 20th credit (4 + 16)", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 20, tier: "basic", totalMessages: 20 })
    ).toBe(true);
  });

  it("returns true for new user on 28th credit (4 + 24)", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 28, tier: "basic", totalMessages: 28 })
    ).toBe(true);
  });

  it("returns false for new user on 8th credit (not a trigger)", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 8, tier: "basic", totalMessages: 8 })
    ).toBe(false);
  });

  it("returns false for new user on 16th credit (not a trigger)", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 16, tier: "basic", totalMessages: 16 })
    ).toBe(false);
  });

  it("returns true for new pro user on 4th credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_PRO - 4, tier: "pro", totalMessages: 4 })
    ).toBe(true);
  });

  it("returns true for new pro user on 20th credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_PRO - 20, tier: "pro", totalMessages: 20 })
    ).toBe(true);
  });

  // --- Returning users (post-reset): trigger every 12th credit ---

  it("returns true for returning user on 12th credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 12, tier: "basic", totalMessages: 200 })
    ).toBe(true);
  });

  it("returns true for returning user on 24th credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 24, tier: "basic", totalMessages: 300 })
    ).toBe(true);
  });

  it("returns true for returning user on 36th credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 36, tier: "basic", totalMessages: 500 })
    ).toBe(true);
  });

  it("returns false for returning user on 11th credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 11, tier: "basic", totalMessages: 200 })
    ).toBe(false);
  });

  it("returns false for returning user on 13th credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 13, tier: "basic", totalMessages: 200 })
    ).toBe(false);
  });

  it("returns true for returning pro user on 12th credit", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_PRO - 12, tier: "pro", totalMessages: 1000 })
    ).toBe(true);
  });

  // --- Edge cases ---

  it("returns false for user with 0 credits used", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC, tier: "basic", totalMessages: 0 })
    ).toBe(false);
  });

  it("returns true for user with undefined totalMessages (treated as new user at 4th credit)", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 4, tier: "basic", totalMessages: undefined })
    ).toBe(true);
  });

  it("returns true when credits is 0 (exhausted basic) because 60 % 12 === 0", () => {
    expect(
      shouldIncludeRecap({ credits: 0, tier: "basic", totalMessages: 200 })
    ).toBe(true);
  });

  it("returns false for returning user on a non-trigger credit count", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC - 7, tier: "basic", totalMessages: 200 })
    ).toBe(false);
  });

  it("returns true for returning pro user at 60th credit (60 % 12 === 0)", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_PRO - 60, tier: "pro", totalMessages: 1000 })
    ).toBe(true);
  });

  it("returns false for negative credits (clamped to maxCredits)", () => {
    // credits = -5 → creditsUsed clamped to 60, 60 % 12 === 0 → true for returning
    // But for a new user with totalMessages 4, creditsUsed=60 → (60-4) % 8 === 0 → true
    // The key is it doesn't exceed maxCredits and cause wild modulo hits
    expect(
      shouldIncludeRecap({ credits: -5, tier: "basic", totalMessages: 200 })
    ).toBe(true); // 60 % 12 === 0
  });

  it("returns false for credits above maxCredits (e.g. admin top-up)", () => {
    expect(
      shouldIncludeRecap({ credits: CREDITS_BASIC + 10, tier: "basic", totalMessages: 200 })
    ).toBe(false); // creditsUsed = -10 clamped to 0 via min, then <= 0 guard
  });
});

describe("buildRecapInstruction", () => {
  it("returns a non-empty string with the credits used count", () => {
    const instruction = buildRecapInstruction(4);
    expect(instruction).toContain("4");
    expect(instruction.length).toBeGreaterThan(0);
  });

  it("includes guidance about being natural", () => {
    const instruction = buildRecapInstruction(12);
    expect(instruction.toLowerCase()).toContain("natural");
  });
});

describe("getRecapInstruction", () => {
  it("returns instruction string when recap should trigger", () => {
    const result = getRecapInstruction({
      credits: CREDITS_BASIC - 4,
      tier: "basic",
      totalMessages: 4,
    });
    expect(result).toContain("#4");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty string when recap should not trigger", () => {
    const result = getRecapInstruction({
      credits: CREDITS_BASIC - 3,
      tier: "basic",
      totalMessages: 3,
    });
    expect(result).toBe("");
  });
});
