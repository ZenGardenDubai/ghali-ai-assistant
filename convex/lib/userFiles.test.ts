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

  it("mentions background reflection agent", () => {
    expect(AGENT_INSTRUCTIONS).toContain(
      "background reflection agent"
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
});
