import { describe, it, expect } from "vitest";
import {
  parseCronField,
  getNextCronRun,
  parseDatetimeInTimezone,
} from "./cronParser";

describe("parseCronField", () => {
  it("handles wildcard *", () => {
    expect(parseCronField("*", 0, 59)).toEqual(
      Array.from({ length: 60 }, (_, i) => i)
    );
  });

  it("handles step */15", () => {
    expect(parseCronField("*/15", 0, 59)).toEqual([0, 15, 30, 45]);
  });

  it("handles range 1-5", () => {
    expect(parseCronField("1-5", 0, 59)).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles list 1,3,5", () => {
    expect(parseCronField("1,3,5", 0, 59)).toEqual([1, 3, 5]);
  });

  it("handles specific value", () => {
    expect(parseCronField("30", 0, 59)).toEqual([30]);
  });

  it("handles range with step 1-10/3", () => {
    expect(parseCronField("1-10/3", 0, 59)).toEqual([1, 4, 7, 10]);
  });

  it("throws on out-of-range value", () => {
    expect(() => parseCronField("60", 0, 59)).toThrow();
  });

  it("throws on out-of-range in range", () => {
    expect(() => parseCronField("70-80", 0, 59)).toThrow(/out of bounds/);
  });
});

describe("getNextCronRun", () => {
  it("daily at 7:30 — returns next 7:30", () => {
    // after is 2026-02-21 at 06:00 UTC (before 7:30)
    const after = new Date("2026-02-21T06:00:00Z");
    const next = getNextCronRun("30 7 * * *", "UTC", after);
    const date = new Date(next);
    expect(date.getUTCHours()).toBe(7);
    expect(date.getUTCMinutes()).toBe(30);
    expect(date.getUTCDate()).toBe(21);
  });

  it("daily at 7:30 — after 7:30 returns next day", () => {
    const after = new Date("2026-02-21T08:00:00Z");
    const next = getNextCronRun("30 7 * * *", "UTC", after);
    const date = new Date(next);
    expect(date.getUTCHours()).toBe(7);
    expect(date.getUTCMinutes()).toBe(30);
    expect(date.getUTCDate()).toBe(22);
  });

  it("weekdays at 9:00 — skips weekends", () => {
    // 2026-02-21 is Saturday
    const after = new Date("2026-02-21T10:00:00Z");
    const next = getNextCronRun("0 9 * * 1-5", "UTC", after);
    const date = new Date(next);
    expect(date.getUTCDay()).toBe(1); // Monday
    expect(date.getUTCHours()).toBe(9);
    expect(date.getUTCDate()).toBe(23);
  });

  it("every 15 minutes", () => {
    const after = new Date("2026-02-21T10:07:00Z");
    const next = getNextCronRun("*/15 * * * *", "UTC", after);
    const date = new Date(next);
    expect(date.getUTCMinutes()).toBe(15);
    expect(date.getUTCHours()).toBe(10);
  });

  it("handles timezone offset (Asia/Dubai = UTC+4)", () => {
    // 2026-02-21 at 03:00 UTC = 07:00 Dubai
    // Cron "30 7 * * *" in Dubai timezone = 7:30 Dubai = 3:30 UTC
    const after = new Date("2026-02-21T03:00:00Z");
    const next = getNextCronRun("30 7 * * *", "Asia/Dubai", after);
    const date = new Date(next);
    // 7:30 Dubai = 3:30 UTC
    expect(date.getUTCHours()).toBe(3);
    expect(date.getUTCMinutes()).toBe(30);
  });

  it("current time matches cron — returns next occurrence, not current", () => {
    // Exactly at 7:30 UTC
    const after = new Date("2026-02-21T07:30:00Z");
    const next = getNextCronRun("30 7 * * *", "UTC", after);
    const date = new Date(next);
    // Should be next day's 7:30, not today's
    expect(date.getUTCDate()).toBe(22);
  });

  it("weekly Monday at 15:00", () => {
    // 2026-02-21 is Saturday
    const after = new Date("2026-02-21T10:00:00Z");
    const next = getNextCronRun("0 15 * * 1", "UTC", after);
    const date = new Date(next);
    expect(date.getUTCDay()).toBe(1); // Monday
    expect(date.getUTCHours()).toBe(15);
    expect(date.getUTCMinutes()).toBe(0);
  });
});

describe("parseDatetimeInTimezone", () => {
  it("converts Asia/Dubai datetime to UTC epoch", () => {
    // 2026-02-21 16:18 in Dubai = 12:18 UTC
    const epoch = parseDatetimeInTimezone("2026-02-21T16:18:00", "Asia/Dubai");
    const date = new Date(epoch);
    expect(date.getUTCHours()).toBe(12);
    expect(date.getUTCMinutes()).toBe(18);
    expect(date.getUTCDate()).toBe(21);
  });

  it("converts UTC datetime correctly", () => {
    const epoch = parseDatetimeInTimezone("2026-02-21T10:00:00", "UTC");
    const date = new Date(epoch);
    expect(date.getUTCHours()).toBe(10);
    expect(date.getUTCMinutes()).toBe(0);
  });

  it("converts Europe/London datetime correctly", () => {
    // In February, London is UTC+0 (no DST)
    const epoch = parseDatetimeInTimezone("2026-02-21T14:30:00", "Europe/London");
    const date = new Date(epoch);
    expect(date.getUTCHours()).toBe(14);
    expect(date.getUTCMinutes()).toBe(30);
  });
});
