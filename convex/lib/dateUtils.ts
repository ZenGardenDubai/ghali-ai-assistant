/**
 * Pure Dubai-timezone date boundary utilities.
 * Dubai is UTC+4 with no daylight saving time.
 * All functions accept a Unix timestamp in milliseconds and return one.
 */

const DUBAI_TZ = "Asia/Dubai"; // UTC+4, no DST
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns midnight (00:00:00) of the current Dubai calendar day
 * for the given Unix timestamp, expressed as a UTC Unix timestamp in ms.
 *
 * Example: 2024-01-15T12:00:00+04:00 → 2024-01-15T00:00:00+04:00 = 2024-01-14T20:00:00Z
 */
export function getDubaiMidnightMs(now: number = Date.now()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DUBAI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  // Construct ISO 8601 string anchored to Dubai midnight
  return new Date(`${year}-${month}-${day}T00:00:00+04:00`).getTime();
}

/**
 * Returns the start of the current Dubai calendar week (Sunday at 00:00 UTC+4)
 * for the given Unix timestamp, expressed as a UTC Unix timestamp in ms.
 *
 * Week starts on Sunday per UAE convention.
 */
export function getDubaiWeekStartMs(now: number = Date.now()): number {
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: DUBAI_TZ,
    weekday: "short",
  }).format(new Date(now));

  const dayOffset: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const offset = dayOffset[dayName] ?? 0;
  return getDubaiMidnightMs(now) - offset * MS_PER_DAY;
}

/**
 * Returns the start of the current Dubai calendar month (1st at 00:00 UTC+4)
 * for the given Unix timestamp, expressed as a UTC Unix timestamp in ms.
 */
export function getDubaiMonthStartMs(now: number = Date.now()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DUBAI_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(now));

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;

  return new Date(`${year}-${month}-01T00:00:00+04:00`).getTime();
}
