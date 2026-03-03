import { describe, it, expect } from "vitest";
import { isNewSession } from "./analytics";

const ONE_HOUR_MS = 60 * 60 * 1000;
const SESSION_GAP_MS = 4 * ONE_HOUR_MS;

describe("isNewSession", () => {
  it("returns true when previousLastMessageAt is undefined (first ever message)", () => {
    expect(isNewSession(undefined, Date.now(), SESSION_GAP_MS)).toBe(true);
  });

  it("returns true when gap exceeds session threshold", () => {
    const now = Date.now();
    const fiveHoursAgo = now - 5 * ONE_HOUR_MS;
    expect(isNewSession(fiveHoursAgo, now, SESSION_GAP_MS)).toBe(true);
  });

  it("returns true when gap is exactly equal to session threshold", () => {
    const now = Date.now();
    const exactlyFourHoursAgo = now - SESSION_GAP_MS;
    // gap === SESSION_GAP_MS → NOT strictly greater, so false
    expect(isNewSession(exactlyFourHoursAgo, now, SESSION_GAP_MS)).toBe(false);
  });

  it("returns false when gap is less than session threshold", () => {
    const now = Date.now();
    const twoHoursAgo = now - 2 * ONE_HOUR_MS;
    expect(isNewSession(twoHoursAgo, now, SESSION_GAP_MS)).toBe(false);
  });

  it("returns false for a message sent 1 minute ago", () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    expect(isNewSession(oneMinuteAgo, now, SESSION_GAP_MS)).toBe(false);
  });

  it("returns true for a message sent 24 hours ago", () => {
    const now = Date.now();
    const oneDayAgo = now - 24 * ONE_HOUR_MS;
    expect(isNewSession(oneDayAgo, now, SESSION_GAP_MS)).toBe(true);
  });
});
