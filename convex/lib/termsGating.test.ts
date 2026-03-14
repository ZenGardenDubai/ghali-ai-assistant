import { describe, it, expect } from "vitest";
import { needsTermsAcceptance } from "./termsGating";

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
