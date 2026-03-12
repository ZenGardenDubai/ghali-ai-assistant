import { describe, it, expect } from "vitest";
import {
  MAX_USER_FILE_SIZE,
  isFileTooLarge,
  buildUserContext,
  classifyQueryComplexity,
  summarizeMemoryL0,
  MEMORY_L0_MAX_CHARS,
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

  it("uses full memory when memoryTier is 'full'", () => {
    const longMemory = "## Preferences\n" + "- preference item\n".repeat(60);
    const files = [{ filename: "memory", content: longMemory }];
    const result = buildUserContext(files, datetime, undefined, "full");
    expect(result).toContain(longMemory);
    expect(result).not.toContain("[... abbreviated]");
  });

  it("uses compact memory when memoryTier is 'compact' and memory is long", () => {
    const longMemory = "## Preferences\n" + "- preference item\n".repeat(60);
    const files = [{ filename: "memory", content: longMemory }];
    const result = buildUserContext(files, datetime, undefined, "compact");
    expect(result).toContain("## User Memory");
    expect(result).toContain("[... abbreviated]");
    // Should be much shorter than the full memory
    expect(result.length).toBeLessThan(longMemory.length);
  });

  it("uses full memory when memoryTier is omitted (backwards compat)", () => {
    const longMemory = "## Preferences\n" + "- preference item\n".repeat(60);
    const files = [{ filename: "memory", content: longMemory }];
    const result = buildUserContext(files, datetime);
    expect(result).toContain(longMemory);
    expect(result).not.toContain("[... abbreviated]");
  });

  it("does not abbreviate short memory even with compact tier", () => {
    const shortMemory = "## Preferences\n- Likes coffee";
    const files = [{ filename: "memory", content: shortMemory }];
    const result = buildUserContext(files, datetime, undefined, "compact");
    expect(result).toContain(shortMemory);
    expect(result).not.toContain("[... abbreviated]");
  });
});

describe("classifyQueryComplexity", () => {
  it("returns 'simple' for a short query with no personal markers", () => {
    expect(classifyQueryComplexity("what is 15% of 500")).toBe("simple");
  });

  it("returns 'simple' for a translation request", () => {
    expect(classifyQueryComplexity("translate hello to french")).toBe("simple");
  });

  it("returns 'simple' for a general knowledge question", () => {
    expect(classifyQueryComplexity("who wrote hamlet")).toBe("simple");
  });

  it("returns 'complex' for a query with 'my'", () => {
    expect(classifyQueryComplexity("what are my expenses")).toBe("complex");
  });

  it("returns 'complex' for a query with 'me'", () => {
    expect(classifyQueryComplexity("remind me at 3pm")).toBe("complex");
  });

  it("returns 'complex' for a query with \"i'm\"", () => {
    expect(classifyQueryComplexity("i'm working on a project")).toBe("complex");
  });

  it("returns 'complex' for a query with \"i've\"", () => {
    expect(classifyQueryComplexity("i've been busy")).toBe("complex");
  });

  it("returns 'complex' for a long query (> 6 words)", () => {
    expect(classifyQueryComplexity("what is the weather in dubai today")).toBe("complex");
  });

  it("returns 'complex' for empty string", () => {
    expect(classifyQueryComplexity("")).toBe("complex");
  });

  it("returns 'complex' for whitespace-only string", () => {
    expect(classifyQueryComplexity("   ")).toBe("complex");
  });

  it("is case-insensitive for personal markers", () => {
    expect(classifyQueryComplexity("What are MY plans")).toBe("complex");
    expect(classifyQueryComplexity("Help ME with this")).toBe("complex");
  });

  it("returns 'simple' for a 6-word query with no personal markers", () => {
    expect(classifyQueryComplexity("what is two plus two equal")).toBe("simple");
  });
});

describe("summarizeMemoryL0", () => {
  it("returns content unchanged when under maxChars", () => {
    const content = "## Preferences\n- Likes coffee\n- Early riser";
    expect(summarizeMemoryL0(content)).toBe(content);
  });

  it("truncates at a line boundary and appends abbreviation note", () => {
    const line = "- this is a memory bullet point item\n";
    const content = line.repeat(30); // well over 600 chars
    const result = summarizeMemoryL0(content);
    expect(result.length).toBeLessThanOrEqual(MEMORY_L0_MAX_CHARS + 30); // a bit over due to appended note
    expect(result).toContain("[... abbreviated]");
    // Should end cleanly at a line boundary before the note
    const beforeNote = result.split("[... abbreviated]")[0]!;
    expect(beforeNote.endsWith("\n")).toBe(true);
  });

  it("respects custom maxChars parameter", () => {
    const content = "a".repeat(200);
    const result = summarizeMemoryL0(content, 100);
    expect(result.length).toBeLessThanOrEqual(120); // 100 + abbreviation note length
    expect(result).toContain("[... abbreviated]");
  });

  it("exports MEMORY_L0_MAX_CHARS as a positive number", () => {
    expect(MEMORY_L0_MAX_CHARS).toBeGreaterThan(0);
  });
});
