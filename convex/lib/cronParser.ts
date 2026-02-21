// Minimal cron expression parser — Web-standard only (no Node deps).
// Supports 5-field cron: minute hour day-of-month month day-of-week
// Fields: *, specific values, ranges (1-5), lists (1,3,5), steps, range-steps
// Day-of-week: 0=Sun, 1=Mon, ..., 6=Sat

/**
 * Parse a single cron field into an array of matching values.
 * Supports: *, N, N-M, N,M, N/step, N-M/step
 */
export function parseCronField(
  field: string,
  min: number,
  max: number
): number[] {
  const values: Set<number> = new Set();

  for (const part of field.split(",")) {
    if (part.includes("/")) {
      // Step: */N or M-N/S
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr, 10);
      let start = min;
      let end = max;
      if (range !== "*") {
        if (range.includes("-")) {
          [start, end] = range.split("-").map(Number);
        } else {
          start = parseInt(range, 10);
        }
      }
      for (let i = start; i <= end; i += step) {
        values.add(i);
      }
    } else if (part.includes("-")) {
      // Range: N-M
      const [start, end] = part.split("-").map(Number);
      if (start < min || end > max || start > end) {
        throw new Error(
          `Cron range ${start}-${end} out of bounds [${min}-${max}]`
        );
      }
      for (let i = start; i <= end; i++) {
        values.add(i);
      }
    } else if (part === "*") {
      for (let i = min; i <= max; i++) {
        values.add(i);
      }
    } else {
      // Specific value
      const val = parseInt(part, 10);
      if (val < min || val > max) {
        throw new Error(
          `Cron field value ${val} out of range [${min}-${max}]`
        );
      }
      values.add(val);
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

/**
 * Get the UTC offset in minutes for a timezone at a given date.
 * Uses Intl.DateTimeFormat (Web-standard).
 */
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  // Format the date in both UTC and the target timezone
  const utcParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (parts: Intl.DateTimeFormatPart[], type: string) => {
    const val = parts.find((p) => p.type === type)?.value ?? "0";
    // Handle hour "24" → 0
    return parseInt(val === "24" ? "0" : val, 10);
  };

  const utcDate = Date.UTC(
    get(utcParts, "year"),
    get(utcParts, "month") - 1,
    get(utcParts, "day"),
    get(utcParts, "hour"),
    get(utcParts, "minute"),
    get(utcParts, "second")
  );

  const tzDate = Date.UTC(
    get(tzParts, "year"),
    get(tzParts, "month") - 1,
    get(tzParts, "day"),
    get(tzParts, "hour"),
    get(tzParts, "minute"),
    get(tzParts, "second")
  );

  // offset = tz - utc (in minutes)
  return (tzDate - utcDate) / 60000;
}

/**
 * Get the next cron run time after `after` (epoch ms).
 * Iterates minute-by-minute in the target timezone until a match is found.
 */
export function getNextCronRun(
  cronExpr: string,
  timezone: string,
  after?: Date
): number {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: expected 5 fields, got ${parts.length}`);
  }

  const minutes = parseCronField(parts[0], 0, 59);
  const hours = parseCronField(parts[1], 0, 23);
  const daysOfMonth = parseCronField(parts[2], 1, 31);
  const months = parseCronField(parts[3], 1, 12);
  const daysOfWeek = parseCronField(parts[4], 0, 6);

  const minuteSet = new Set(minutes);
  const hourSet = new Set(hours);
  const domSet = new Set(daysOfMonth);
  const monthSet = new Set(months);
  const dowSet = new Set(daysOfWeek);

  const startDate = after ?? new Date();
  const offset = getTimezoneOffsetMinutes(timezone, startDate);

  // Convert "after" to local time in the target timezone
  const localMs = startDate.getTime() + offset * 60000;
  const localDate = new Date(localMs);

  // Start from the next minute
  localDate.setUTCSeconds(0, 0);
  localDate.setUTCMinutes(localDate.getUTCMinutes() + 1);

  // Search up to 366 days ahead
  const maxIterations = 366 * 24 * 60;
  for (let i = 0; i < maxIterations; i++) {
    const month = localDate.getUTCMonth() + 1;
    const day = localDate.getUTCDate();
    const dow = localDate.getUTCDay();
    const hour = localDate.getUTCHours();
    const minute = localDate.getUTCMinutes();

    if (
      monthSet.has(month) &&
      domSet.has(day) &&
      dowSet.has(dow) &&
      hourSet.has(hour) &&
      minuteSet.has(minute)
    ) {
      // Convert back to UTC
      // Re-compute offset at this specific local time for DST accuracy
      const candidateUtcMs = localDate.getTime() - offset * 60000;
      const preciseOffset = getTimezoneOffsetMinutes(
        timezone,
        new Date(candidateUtcMs)
      );
      return localDate.getTime() - preciseOffset * 60000;
    }

    localDate.setUTCMinutes(localDate.getUTCMinutes() + 1);
  }

  throw new Error(`No matching cron time found within 366 days for: ${cronExpr}`);
}

/**
 * Interpret a naive ISO datetime string in the given timezone,
 * returning an epoch ms value.
 *
 * Example: parseDatetimeInTimezone("2026-02-21T16:18:00", "Asia/Dubai")
 * → epoch ms of 2026-02-21T12:18:00Z (since Dubai is UTC+4)
 */
export function parseDatetimeInTimezone(
  isoString: string,
  timezone: string
): number {
  // Parse the ISO string as if it were UTC
  const parts = isoString.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
  );
  if (!parts) {
    throw new Error(`Invalid ISO datetime: ${isoString}`);
  }

  const [, yearStr, monthStr, dayStr, hourStr, minStr, secStr] = parts;
  const asUtc = Date.UTC(
    parseInt(yearStr, 10),
    parseInt(monthStr, 10) - 1,
    parseInt(dayStr, 10),
    parseInt(hourStr, 10),
    parseInt(minStr, 10),
    parseInt(secStr, 10)
  );

  // This is the "local" time the user means. We need to find the UTC time
  // such that when displayed in the target timezone, it shows this datetime.
  // offset = tz - utc → utc = local - offset
  const offset = getTimezoneOffsetMinutes(timezone, new Date(asUtc));
  return asUtc - offset * 60000;
}
