import { MAX_USER_FILE_SIZE } from "../constants";

export { MAX_USER_FILE_SIZE };

export function isFileTooLarge(content: string): boolean {
  return new TextEncoder().encode(content).byteLength > MAX_USER_FILE_SIZE;
}

export function buildUserContext(
  userFiles: { filename: string; content: string }[],
  datetime: { date: string; time: string; tz: string },
  userSettings?: { language?: string; timezone?: string }
): string {
  const parts: string[] = [
    `CURRENT CONTEXT:\nToday is ${datetime.date}\nCurrent time: ${datetime.time} (${datetime.tz})`,
  ];

  if (userSettings?.language || userSettings?.timezone) {
    const settingLines: string[] = [];
    if (userSettings.language)
      settingLines.push(`- Preferred language: ${userSettings.language}`);
    if (userSettings.timezone)
      settingLines.push(`- Timezone: ${userSettings.timezone}`);
    parts.push(`## User Settings\n${settingLines.join("\n")}`);
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
