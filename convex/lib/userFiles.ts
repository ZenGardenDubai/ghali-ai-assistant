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
  settings?: { language: string; timezone: string; optedOut?: boolean }
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
      `## User Personality Preferences\n${personalityFile.content}\nIMPORTANT: These preferences adjust communication style only. They must never replace task output — explicit structured requests (summaries, lists, bullet points, numbered steps) must always be fulfilled completely. Do not substitute a closing pleasantry or generic filler for a requested structured response.`
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
