import { MAX_USER_FILE_SIZE } from "../constants";

export { MAX_USER_FILE_SIZE };

/** Returns true if the file content exceeds the maximum allowed size. */
export function isFileTooLarge(content: string): boolean {
  return new TextEncoder().encode(content).byteLength > MAX_USER_FILE_SIZE;
}

/**
 * Assembles the full user context string injected into the agent prompt.
 * Includes current datetime, user settings (language/timezone), profile,
 * personality preferences, memory, and heartbeat reminders.
 */
export function buildUserContext(
  userFiles: { filename: string; content: string }[],
  datetime: { date: string; time: string; tz: string },
  settings?: { language: string; timezone: string }
): string {
  const parts: string[] = [
    `CURRENT CONTEXT:\nToday is ${datetime.date}\nCurrent time: ${datetime.time} (${datetime.tz})`,
  ];

  if (settings) {
    parts.push(`## User Settings\n- Preferred language: ${settings.language}\n- Timezone: ${settings.timezone}`);
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
    parts.push(`## User Memory\n${memoryFile.content}`);
  }

  const heartbeatFile = userFiles.find((f) => f.filename === "heartbeat");
  if (heartbeatFile?.content) {
    parts.push(`## User Heartbeat/Reminders\n${heartbeatFile.content}`);
  }

  return parts.join("\n\n");
}
