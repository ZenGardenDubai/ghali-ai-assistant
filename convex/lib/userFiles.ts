import { MAX_USER_FILE_SIZE } from "../constants";

export { MAX_USER_FILE_SIZE };

export function isFileTooLarge(content: string): boolean {
  return new TextEncoder().encode(content).byteLength > MAX_USER_FILE_SIZE;
}

export function buildUserContext(
  userFiles: { filename: string; content: string }[],
  datetime: { date: string; time: string; tz: string }
): string {
  const parts: string[] = [
    `CURRENT CONTEXT:\nToday is ${datetime.date}\nCurrent time: ${datetime.time} (${datetime.tz})`,
  ];

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
