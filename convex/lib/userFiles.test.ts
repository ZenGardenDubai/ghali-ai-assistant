import { describe, it, expect } from "vitest";
import {
  MAX_USER_FILE_SIZE,
  isFileTooLarge,
  buildUserContext,
} from "./userFiles";
import { SYSTEM_BLOCK, AGENT_INSTRUCTIONS } from "../agent";

describe("isFileTooLarge", () => {
  it("allows content under 10KB", () => {
    expect(isFileTooLarge("short content")).toBe(false);
  });

  it("allows content at exactly 10KB", () => {
    const content = "a".repeat(MAX_USER_FILE_SIZE);
    expect(isFileTooLarge(content)).toBe(false);
  });

  it("rejects content over 10KB", () => {
    const content = "a".repeat(MAX_USER_FILE_SIZE + 1);
    expect(isFileTooLarge(content)).toBe(true);
  });

  it("allows empty content", () => {
    expect(isFileTooLarge("")).toBe(false);
  });

  it("exports MAX_USER_FILE_SIZE as 10240", () => {
    expect(MAX_USER_FILE_SIZE).toBe(10240);
  });

  it("rejects multi-byte content that exceeds 10KB in UTF-8 bytes", () => {
    // Arabic char "م" is 2 bytes in UTF-8, so 5121 chars = 10242 bytes > 10KB
    const content = "م".repeat(5121);
    expect(content.length).toBe(5121); // under 10240 chars
    expect(isFileTooLarge(content)).toBe(true); // but over 10240 bytes
  });

  it("allows multi-byte content that fits within 10KB in UTF-8 bytes", () => {
    // 5120 Arabic chars = 10240 bytes = exactly 10KB
    const content = "م".repeat(5120);
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

  it("contains memory rules", () => {
    expect(AGENT_INSTRUCTIONS).toContain("MEMORY RULES");
  });

  it("instructs to call updateMemory", () => {
    expect(AGENT_INSTRUCTIONS).toContain("updateMemory");
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

  it("includes all three files in correct order", () => {
    const files = [
      { filename: "memory", content: "Name: Hesham" },
      { filename: "personality", content: "Casual tone" },
      { filename: "heartbeat", content: "- gym 7am" },
    ];
    const result = buildUserContext(files, datetime);

    const personalityIdx = result.indexOf("## User Personality Preferences");
    const memoryIdx = result.indexOf("## User Memory");
    const heartbeatIdx = result.indexOf("## User Heartbeat/Reminders");

    // Order: datetime, personality, memory, heartbeat
    expect(personalityIdx).toBeGreaterThan(0);
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
