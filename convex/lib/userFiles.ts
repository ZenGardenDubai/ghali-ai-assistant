import { MAX_USER_FILE_SIZE } from "../constants";

export { MAX_USER_FILE_SIZE };

/** Returns true if the file content exceeds the maximum allowed size. */
export function isFileTooLarge(content: string): boolean {
  return new TextEncoder().encode(content).byteLength > MAX_USER_FILE_SIZE;
}

/** Character limit for L0 compact memory view (~100-200 tokens). */
export const MEMORY_L0_MAX_CHARS = 600;

/**
 * Returns a compact L0 summary of a memory file by truncating at the nearest
 * line boundary below maxChars. Appends an abbreviation note when truncated.
 * Used for simple queries that don't need the full memory context.
 */
export function summarizeMemoryL0(
  content: string,
  maxChars: number = MEMORY_L0_MAX_CHARS
): string {
  if (content.length <= maxChars) return content;
  const truncated = content.substring(0, maxChars);
  const lastNewline = truncated.lastIndexOf("\n");
  const cutPoint = lastNewline > 0 ? lastNewline + 1 : maxChars;
  return content.substring(0, cutPoint) + "[... abbreviated]";
}

/**
 * Classify a query as needing compact (L0) or full memory context.
 * Returns "simple" only for short (≤ 6 words), non-personal queries.
 * Conservative by design — defaults to "complex" when in doubt.
 */
export function classifyQueryComplexity(query: string): "simple" | "complex" {
  if (!query?.trim()) return "complex";
  const lower = query.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  if (wordCount > 6) return "complex";
  // First-person markers indicate the query involves personal context
  const padded = ` ${lower} `;
  const personalMarkers = [" my ", " me ", " i ", "i've", "i'm", " mine", " myself"];
  if (personalMarkers.some((m) => padded.includes(m))) return "complex";
  return "simple";
}

/**
 * Assembles the full user context string injected into the agent prompt.
 * Includes current datetime, user settings (language/timezone), profile,
 * personality preferences, memory, and heartbeat reminders.
 *
 * @param memoryTier - "compact" injects a L0 summary of memory for simple
 *   queries; "full" (default) injects the complete memory file.
 */
export function buildUserContext(
  userFiles: { filename: string; content: string }[],
  datetime: { date: string; time: string; tz: string },
  settings?: { language: string; timezone: string; optedOut?: boolean },
  memoryTier?: "full" | "compact"
): string {
  const parts: string[] = [
    `CURRENT CONTEXT:\nToday is ${datetime.date}\nCurrent time: ${datetime.time} (${datetime.tz})`,
  ];

  if (settings) {
    const settingsLines = [
      `- Preferred language: ${settings.language}`,
      `- Timezone: ${settings.timezone}`,
    ];
    if (settings.optedOut) {
      settingsLines.push(`- Notifications: PAUSED (user sent STOP — reminders and proactive messages will not be delivered until they send START)`);
    }
    parts.push(`## User Settings\n${settingsLines.join("\n")}`);
  }

  const profileFile = userFiles.find((f) => f.filename === "profile");
  if (profileFile?.content) {
    parts.push(`## User Profile\n${profileFile.content}`);
  }

  const personalityFile = userFiles.find((f) => f.filename === "personality");
  if (personalityFile?.content) {
    parts.push(
      `## User Personality Preferences\n${personalityFile.content}`
    );
  }

  const memoryFile = userFiles.find((f) => f.filename === "memory");
  if (memoryFile?.content) {
    const memoryContent =
      memoryTier === "compact"
        ? summarizeMemoryL0(memoryFile.content)
        : memoryFile.content;
    parts.push(`## User Memory\n${memoryContent}`);
  }

  const heartbeatFile = userFiles.find((f) => f.filename === "heartbeat");
  if (heartbeatFile?.content) {
    parts.push(`## User Heartbeat/Reminders\n${heartbeatFile.content}`);
  }

  return parts.join("\n\n");
}
