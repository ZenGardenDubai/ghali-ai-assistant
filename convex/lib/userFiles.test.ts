import { describe, it, expect } from "vitest";
import {
  MAX_USER_FILE_SIZE,
  isFileTooLarge,
  buildUserContext,
} from "./userFiles";
import { SYSTEM_BLOCK, AGENT_INSTRUCTIONS } from "../agent";

describe("isFileTooLarge", () => {
  it("allows content under 50KB", () => {
    expect(isFileTooLarge("short content")).toBe(false);
  });

  it("allows content at exactly 50KB", () => {
    const content = "a".repeat(MAX_USER_FILE_SIZE);
    expect(isFileTooLarge(content)).toBe(false);
  });

  it("rejects content over 50KB", () => {
    const content = "a".repeat(MAX_USER_FILE_SIZE + 1);
    expect(isFileTooLarge(content)).toBe(true);
  });

  it("allows empty content", () => {
    expect(isFileTooLarge("")).toBe(false);
  });

  it("exports MAX_USER_FILE_SIZE as 51200", () => {
    expect(MAX_USER_FILE_SIZE).toBe(51200);
  });

  it("rejects multi-byte content that exceeds 50KB in UTF-8 bytes", () => {
    // Arabic char "م" is 2 bytes in UTF-8, so 25601 chars = 51202 bytes > 50KB
    const content = "م".repeat(25601);
    expect(content.length).toBe(25601); // under 51200 chars
    expect(isFileTooLarge(content)).toBe(true); // but over 51200 bytes
  });

  it("allows multi-byte content that fits within 50KB in UTF-8 bytes", () => {
    // 25600 Arabic chars = 51200 bytes = exactly 50KB
    const content = "م".repeat(25600);
    expect(isFileTooLarge(content)).toBe(false);
  });
});

describe("SYSTEM_BLOCK", () => {
  it("contains privacy directive", () => {
    expect(SYSTEM_BLOCK).toContain("Privacy-first");
  });

  it("contains honesty directive", () => {
    expect(SYSTEM_BLOCK).toContain("honest");
  });

  it("contains identity directive", () => {
    expect(SYSTEM_BLOCK).toContain("Always identify as Ghali");
  });

  it("contains credit-aware directive", () => {
    expect(SYSTEM_BLOCK).toContain("credit-aware");
  });
});

describe("AGENT_INSTRUCTIONS", () => {
  it("includes the system block text", () => {
    expect(AGENT_INSTRUCTIONS).toContain(SYSTEM_BLOCK);
  });

  it("contains profile rules", () => {
    expect(AGENT_INSTRUCTIONS).toContain("PROFILE RULES");
  });

  it("contains memory rules", () => {
    expect(AGENT_INSTRUCTIONS).toContain("MEMORY RULES");
  });

  it("instructs to call updateProfile for identity facts", () => {
    expect(AGENT_INSTRUCTIONS).toContain("updateProfile");
  });

  it("instructs to call appendToMemory", () => {
    expect(AGENT_INSTRUCTIONS).toContain("appendToMemory");
  });

  it("instructs to never ask about remembering", () => {
    expect(AGENT_INSTRUCTIONS).toContain(
      'NEVER ask "should I remember this?"'
    );
  });
});

describe("buildUserContext", () => {
  const datetime = { date: "2026-02-20", time: "14:30", tz: "Asia/Dubai" };

  it("returns datetime context when files are empty", () => {
    const result = buildUserContext([], datetime);
    expect(result).toContain("Today is 2026-02-20");
    expect(result).toContain("14:30 (Asia/Dubai)");
  });

  it("includes user settings when provided", () => {
    const result = buildUserContext([], datetime, { language: "ar", timezone: "Asia/Dubai" });
    expect(result).toContain("## User Settings");
    expect(result).toContain("Preferred language: ar");
    expect(result).toContain("Timezone: Asia/Dubai");
  });

  it("omits user settings section when not provided", () => {
    const result = buildUserContext([], datetime);
    expect(result).not.toContain("## User Settings");
  });

  it("includes personality file with header", () => {
    const files = [{ filename: "personality", content: "Likes casual tone" }];
    const result = buildUserContext(files, datetime);
    expect(result).toContain("## User Personality Preferences");
    expect(result).toContain("Likes casual tone");
  });

  it("includes memory file with header", () => {
    const files = [{ filename: "memory", content: "Name: Hesham" }];
    const result = buildUserContext(files, datetime);
    expect(result).toContain("## User Memory");
    expect(result).toContain("Name: Hesham");
  });

  it("includes heartbeat file with header", () => {
    const files = [
      { filename: "heartbeat", content: "- remind gym 7am daily" },
    ];
    const result = buildUserContext(files, datetime);
    expect(result).toContain("## User Heartbeat/Reminders");
    expect(result).toContain("- remind gym 7am daily");
  });

  it("includes profile file with header", () => {
    const files = [{ filename: "profile", content: "## Personal\nname: Hesham" }];
    const result = buildUserContext(files, datetime);
    expect(result).toContain("## User Profile");
    expect(result).toContain("name: Hesham");
  });

  it("includes all four files in correct order", () => {
    const files = [
      { filename: "memory", content: "Name: Hesham" },
      { filename: "personality", content: "Casual tone" },
      { filename: "heartbeat", content: "- gym 7am" },
      { filename: "profile", content: "## Personal\nname: Hesham" },
    ];
    const result = buildUserContext(files, datetime, { language: "en", timezone: "Asia/Dubai" });

    const settingsIdx = result.indexOf("## User Settings");
    const profileIdx = result.indexOf("## User Profile");
    const personalityIdx = result.indexOf("## User Personality Preferences");
    const memoryIdx = result.indexOf("## User Memory");
    const heartbeatIdx = result.indexOf("## User Heartbeat/Reminders");

    // Order: datetime, settings, profile, personality, memory, heartbeat
    expect(settingsIdx).toBeGreaterThan(0);
    expect(profileIdx).toBeGreaterThan(settingsIdx);
    expect(personalityIdx).toBeGreaterThan(profileIdx);
    expect(memoryIdx).toBeGreaterThan(personalityIdx);
    expect(heartbeatIdx).toBeGreaterThan(memoryIdx);
  });

  it("skips files with empty content", () => {
    const files = [
      { filename: "memory", content: "" },
      { filename: "personality", content: "Casual" },
    ];
    const result = buildUserContext(files, datetime);
    expect(result).not.toContain("## User Memory");
    expect(result).toContain("## User Personality Preferences");
  });

  it("handles unicode content without crashing", () => {
    const files = [{ filename: "memory", content: "Name: 测试用户 😊" }];
    const result = buildUserContext(files, datetime);
    expect(result).toContain("测试用户");
    expect(result).toContain("😊");
  });

  it("handles very long content gracefully", () => {
    const longContent = "x".repeat(50000);
    const files = [{ filename: "memory", content: longContent }];
    const result = buildUserContext(files, datetime);
    expect(result).toContain(longContent);
  });

  it("includes all sections in order when all files present", () => {
    const files = [
      { filename: "profile", content: "Profile data" },
      { filename: "personality", content: "Personality data" },
      { filename: "memory", content: "Memory data" },
      { filename: "heartbeat", content: "Heartbeat data" },
    ];
    const result = buildUserContext(files, datetime, { language: "en", timezone: "UTC" });

    const settingsIdx = result.indexOf("## User Settings");
    const profileIdx = result.indexOf("## User Profile");
    const personalityIdx = result.indexOf("## User Personality Preferences");
    const memoryIdx = result.indexOf("## User Memory");
    const heartbeatIdx = result.indexOf("## User Heartbeat/Reminders");

    expect(settingsIdx).toBeLessThan(profileIdx);
    expect(profileIdx).toBeLessThan(personalityIdx);
    expect(personalityIdx).toBeLessThan(memoryIdx);
    expect(memoryIdx).toBeLessThan(heartbeatIdx);
  });

  it("handles null/undefined content gracefully", () => {
    const files = [
      { filename: "memory", content: null as unknown as string },
      { filename: "personality", content: undefined as unknown as string },
    ];
    const result = buildUserContext(files, datetime);
    expect(result).not.toContain("## User Memory");
    expect(result).not.toContain("## User Personality");
  });
});

// ============================================================================
// isFileTooLarge — Extended Tests
// ============================================================================

describe("isFileTooLarge - Extended", () => {
  it("handles very large content (near boundary)", () => {
    const almostTooLarge = "a".repeat(MAX_USER_FILE_SIZE - 1);
    expect(isFileTooLarge(almostTooLarge)).toBe(false);
  });

  it("rejects content just over the limit", () => {
    const justOverLimit = "a".repeat(MAX_USER_FILE_SIZE + 1);
    expect(isFileTooLarge(justOverLimit)).toBe(true);
  });

  it("handles mixed ASCII and multi-byte characters", () => {
    // Mix of 1-byte (a), 2-byte (م), and 4-byte (😊) characters
    const mixed = "a".repeat(20000) + "م".repeat(10000) + "😊".repeat(5000);
    const byteLength = new TextEncoder().encode(mixed).byteLength;
    expect(isFileTooLarge(mixed)).toBe(byteLength > MAX_USER_FILE_SIZE);
  });

  it("handles empty strings efficiently", () => {
    expect(isFileTooLarge("")).toBe(false);
  });

  it("handles newlines and special characters", () => {
    const withNewlines = "line\n".repeat(10000);
    expect(isFileTooLarge(withNewlines)).toBe(
      new TextEncoder().encode(withNewlines).byteLength > MAX_USER_FILE_SIZE
    );
  });

  it("correctly measures UTF-8 byte length, not character count", () => {
    // 30000 Arabic characters (2 bytes each) = 60000 bytes > 50KB
    const arabic = "م".repeat(30000);
    expect(arabic.length).toBe(30000); // char count
    expect(isFileTooLarge(arabic)).toBe(true); // byte count exceeds
  });
});