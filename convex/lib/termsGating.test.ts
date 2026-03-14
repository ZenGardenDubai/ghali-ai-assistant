import { describe, it, expect } from "vitest";
import {
  needsTermsAcceptance,
  shouldSendTermsPrompt,
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
// shouldSendTermsPrompt
// ============================================================================

describe("shouldSendTermsPrompt", () => {
  it("returns true when termsPromptSentAt is undefined (never sent)", () => {
    expect(shouldSendTermsPrompt({})).toBe(true);
  });

  it("returns false when sent less than 24h ago", () => {
    expect(shouldSendTermsPrompt({ termsPromptSentAt: Date.now() - 1000 })).toBe(false);
  });

  it("returns true when sent more than 24h ago", () => {
    const over24h = Date.now() - (25 * 60 * 60 * 1000);
    expect(shouldSendTermsPrompt({ termsPromptSentAt: over24h })).toBe(true);
  });

  it("returns true when sent exactly 24h ago", () => {
    const exactly24h = Date.now() - (24 * 60 * 60 * 1000);
    expect(shouldSendTermsPrompt({ termsPromptSentAt: exactly24h })).toBe(true);
  });
});

// ============================================================================
// buildAcceptUrl
// ============================================================================

describe("buildAcceptUrl", () => {
  it("builds URL with phone number using default base URL", () => {
    const url = buildAcceptUrl("+971501234567");
    expect(url).toContain("ghali.ae/accept-terms");
    expect(url).toContain("phone=");
    expect(url).toContain("%2B971501234567");
  });

  it("uses custom base URL when provided", () => {
    const url = buildAcceptUrl("+971501234567", "http://localhost:3000");
    expect(url).toBe("http://localhost:3000/accept-terms?phone=%2B971501234567");
  });

  it("encodes special characters in phone number", () => {
    const url = buildAcceptUrl("+1 555 123-4567");
    expect(url).not.toContain(" ");
    expect(url).not.toContain("+");
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

  it("includes English welcome content", () => {
    const msg = buildTermsPromptForNewUser("https://ghali.ae/accept-terms?phone=test");
    expect(msg).toContain("Welcome to Ghali");
  });

  it("includes terms link using default base URL", () => {
    const msg = buildTermsPromptForNewUser("https://ghali.ae/accept-terms?phone=test");
    expect(msg).toContain("https://ghali.ae/terms");
  });

  it("includes terms link using custom base URL", () => {
    const msg = buildTermsPromptForNewUser("http://localhost:3000/accept-terms?phone=test", "http://localhost:3000");
    expect(msg).toContain("http://localhost:3000/terms");
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
