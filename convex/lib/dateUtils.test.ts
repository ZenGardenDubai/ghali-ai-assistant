import { describe, it, expect } from "vitest";
import { getDubaiMidnightMs, getDubaiWeekStartMs, getDubaiMonthStartMs } from "./dateUtils";

/**
 * Dubai is UTC+4 (no DST).
 * Midnight in Dubai = 20:00 UTC the previous day.
 *
 * Reference dates used in tests:
 *   2024-01-14 = Sunday
 *   2024-01-15 = Monday
 *   2024-01-17 = Wednesday
 *   2024-01-20 = Saturday
 */

describe("getDubaiMidnightMs", () => {
  it("returns midnight of the current Dubai day given a midday UTC timestamp", () => {
    // 2024-01-15T08:00:00Z = 2024-01-15T12:00:00+04:00 (midday Monday in Dubai)
    const input = new Date("2024-01-15T08:00:00Z").getTime();
    const midnight = getDubaiMidnightMs(input);
    // Midnight Monday Dubai = 2024-01-15T00:00:00+04:00 = 2024-01-14T20:00:00Z
    expect(midnight).toBe(new Date("2024-01-14T20:00:00Z").getTime());
  });

  it("returns the same day midnight when time is 02:00 Dubai (past midnight)", () => {
    // 2024-01-15T02:00:00+04:00 = 2024-01-14T22:00:00Z
    const input = new Date("2024-01-14T22:00:00Z").getTime();
    const midnight = getDubaiMidnightMs(input);
    // Midnight on 2024-01-15 in Dubai = 2024-01-14T20:00:00Z
    expect(midnight).toBe(new Date("2024-01-14T20:00:00Z").getTime());
  });

  it("returns the exact millisecond when called with midnight itself", () => {
    // 2024-01-15T00:00:00+04:00 = 2024-01-14T20:00:00Z
    const dubaiMidnight = new Date("2024-01-14T20:00:00Z").getTime();
    expect(getDubaiMidnightMs(dubaiMidnight)).toBe(dubaiMidnight);
  });

  it("handles 23:59 Dubai correctly (still same day)", () => {
    // 2024-01-15T23:59:00+04:00 = 2024-01-15T19:59:00Z
    const input = new Date("2024-01-15T19:59:00Z").getTime();
    const midnight = getDubaiMidnightMs(input);
    // Still Monday Jan 15 Dubai → midnight = 2024-01-14T20:00:00Z
    expect(midnight).toBe(new Date("2024-01-14T20:00:00Z").getTime());
  });

  it("rolls over to next day at midnight UTC+4", () => {
    // One second before midnight Dubai = 2024-01-15T23:59:59+04:00 = 2024-01-15T19:59:59Z
    const beforeMidnight = new Date("2024-01-15T19:59:59Z").getTime();
    // One second after midnight Dubai = 2024-01-16T00:00:01+04:00 = 2024-01-15T20:00:01Z
    const afterMidnight = new Date("2024-01-15T20:00:01Z").getTime();

    const midnightBefore = getDubaiMidnightMs(beforeMidnight);
    const midnightAfter = getDubaiMidnightMs(afterMidnight);

    expect(midnightBefore).toBe(new Date("2024-01-14T20:00:00Z").getTime()); // Jan 15 midnight
    expect(midnightAfter).toBe(new Date("2024-01-15T20:00:00Z").getTime());  // Jan 16 midnight
  });
});

describe("getDubaiWeekStartMs", () => {
  it("returns Sunday midnight when today is Wednesday", () => {
    // 2024-01-17 is a Wednesday in Dubai
    // 2024-01-17T08:00:00Z = 2024-01-17T12:00:00+04:00
    const wednesday = new Date("2024-01-17T08:00:00Z").getTime();
    const weekStart = getDubaiWeekStartMs(wednesday);
    // Sunday 2024-01-14 midnight Dubai = 2024-01-13T20:00:00Z
    expect(weekStart).toBe(new Date("2024-01-13T20:00:00Z").getTime());
  });

  it("returns today's midnight when today is Sunday", () => {
    // 2024-01-14 is a Sunday
    // 2024-01-14T08:00:00Z = 2024-01-14T12:00:00+04:00
    const sunday = new Date("2024-01-14T08:00:00Z").getTime();
    const weekStart = getDubaiWeekStartMs(sunday);
    // Sunday 2024-01-14 midnight Dubai = 2024-01-13T20:00:00Z
    expect(weekStart).toBe(new Date("2024-01-13T20:00:00Z").getTime());
  });

  it("returns 6 days ago midnight when today is Saturday", () => {
    // 2024-01-20 is a Saturday
    // 2024-01-20T08:00:00Z = 2024-01-20T12:00:00+04:00
    const saturday = new Date("2024-01-20T08:00:00Z").getTime();
    const weekStart = getDubaiWeekStartMs(saturday);
    // Sunday 2024-01-14 midnight Dubai = 2024-01-13T20:00:00Z
    expect(weekStart).toBe(new Date("2024-01-13T20:00:00Z").getTime());
  });

  it("returns 1 day ago midnight when today is Monday", () => {
    // 2024-01-15 is a Monday
    // 2024-01-15T08:00:00Z = 2024-01-15T12:00:00+04:00
    const monday = new Date("2024-01-15T08:00:00Z").getTime();
    const weekStart = getDubaiWeekStartMs(monday);
    // Sunday 2024-01-14 midnight Dubai = 2024-01-13T20:00:00Z
    expect(weekStart).toBe(new Date("2024-01-13T20:00:00Z").getTime());
  });
});

describe("getDubaiMonthStartMs", () => {
  it("returns 1st of January midnight Dubai for mid-January date", () => {
    // 2024-01-15T08:00:00Z = 2024-01-15T12:00:00+04:00
    const midJan = new Date("2024-01-15T08:00:00Z").getTime();
    const monthStart = getDubaiMonthStartMs(midJan);
    // 2024-01-01T00:00:00+04:00 = 2023-12-31T20:00:00Z
    expect(monthStart).toBe(new Date("2023-12-31T20:00:00Z").getTime());
  });

  it("returns same day midnight when today is the 1st", () => {
    // 2024-01-01T08:00:00Z = 2024-01-01T12:00:00+04:00
    const firstDay = new Date("2024-01-01T08:00:00Z").getTime();
    const monthStart = getDubaiMonthStartMs(firstDay);
    // 2024-01-01T00:00:00+04:00 = 2023-12-31T20:00:00Z
    expect(monthStart).toBe(new Date("2023-12-31T20:00:00Z").getTime());
  });

  it("returns 1st of February midnight Dubai for mid-February date", () => {
    // 2024-02-15T08:00:00Z = 2024-02-15T12:00:00+04:00
    const febMid = new Date("2024-02-15T08:00:00Z").getTime();
    const monthStart = getDubaiMonthStartMs(febMid);
    // 2024-02-01T00:00:00+04:00 = 2024-01-31T20:00:00Z
    expect(monthStart).toBe(new Date("2024-01-31T20:00:00Z").getTime());
  });

  it("handles December correctly (no year rollover issue)", () => {
    // 2024-12-15T08:00:00Z = 2024-12-15T12:00:00+04:00
    const decMid = new Date("2024-12-15T08:00:00Z").getTime();
    const monthStart = getDubaiMonthStartMs(decMid);
    // 2024-12-01T00:00:00+04:00 = 2024-11-30T20:00:00Z
    expect(monthStart).toBe(new Date("2024-11-30T20:00:00Z").getTime());
  });
});
