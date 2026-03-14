import { describe, it, expect } from "vitest";
import {
  needsTermsAcceptance,
  buildAcceptUrl,
  buildTermsPromptForNewUser,
  buildTermsPromptForExistingUser,
} from "./termsGating";

// ============================================================================
// needsTermsAcceptance
// ============================================================================

describe("needsTermsAcceptance", () => {
  it("returns true when termsAcceptedAt is undefined", () => {
    expect(needsTermsAcceptance({})).toBe(true);
  });

  it("returns true when termsAcceptedAt is null-like (undefined)", () => {
    expect(needsTermsAcceptance({ termsAcceptedAt: undefined })).toBe(true);
  });

  it("returns false when termsAcceptedAt is a valid timestamp", () => {
    expect(needsTermsAcceptance({ termsAcceptedAt: Date.now() })).toBe(false);
  });

  it("returns false when termsAcceptedAt is a past timestamp", () => {
    expect(needsTermsAcceptance({ termsAcceptedAt: 1000000 })).toBe(false);
  });
});

// ============================================================================
// buildAcceptUrl
// ============================================================================

describe("buildAcceptUrl", () => {
  it("builds URL with phone number", () => {
    const url = buildAcceptUrl("+971501234567");
    expect(url).toContain("ghali.ae/accept-terms");
    expect(url).toContain("phone=");
    expect(url).toContain("%2B971501234567");
  });

  it("encodes special characters in phone number", () => {
    const url = buildAcceptUrl("+1 (555) 123-4567");
    expect(url).not.toContain(" ");
    expect(url).not.toContain("+");
    expect(url).not.toContain("(");
  });
});

// ============================================================================
// buildTermsPromptForNewUser
// ============================================================================

describe("buildTermsPromptForNewUser", () => {
  it("includes the accept URL", () => {
    const msg = buildTermsPromptForNewUser("https://ghali.ae/accept-terms?phone=%2B971");
    expect(msg).toContain("https://ghali.ae/accept-terms?phone=%2B971");
  });

  it("includes English and Arabic content", () => {
    const msg = buildTermsPromptForNewUser("https://ghali.ae/accept-terms?phone=test");
    expect(msg).toContain("Welcome to Ghali");
    expect(msg).toContain("مرحباً بك في غالي");
  });

  it("includes terms links for both languages", () => {
    const msg = buildTermsPromptForNewUser("https://ghali.ae/accept-terms?phone=test");
    expect(msg).toContain("ghali.ae/terms");
    expect(msg).toContain("ghali.ae/ar/terms");
  });
});

// ============================================================================
// buildTermsPromptForExistingUser
// ============================================================================

describe("buildTermsPromptForExistingUser", () => {
  it("includes the user name", () => {
    const msg = buildTermsPromptForExistingUser("Ahmad", "https://ghali.ae/accept-terms?phone=test");
    expect(msg).toContain("Ahmad");
  });

  it("includes the accept URL", () => {
    const msg = buildTermsPromptForExistingUser("Ahmad", "https://ghali.ae/accept-terms?phone=test");
    expect(msg).toContain("https://ghali.ae/accept-terms?phone=test");
  });

  it("uses fallback when name is undefined", () => {
    const msg = buildTermsPromptForExistingUser(undefined, "https://ghali.ae/accept-terms?phone=test");
    expect(msg).toBeTruthy();
    expect(msg.length).toBeGreaterThan(0);
  });
});
