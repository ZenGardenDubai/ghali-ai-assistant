import { describe, it, expect } from "vitest";
import {
  MEMORY_CATEGORIES,
  CATEGORY_ORDER,
  categoryHeader,
  appendToCategory,
  editMemoryContent,
  needsCompaction,
} from "./memory";

describe("MEMORY_CATEGORIES", () => {
  it("has 6 categories", () => {
    expect(Object.keys(MEMORY_CATEGORIES)).toHaveLength(6);
  });

  it("CATEGORY_ORDER includes all categories", () => {
    const keys = Object.keys(MEMORY_CATEGORIES).sort();
    const ordered = [...CATEGORY_ORDER].sort();
    expect(ordered).toEqual(keys);
  });
});

describe("categoryHeader", () => {
  it("returns ## header for each category", () => {
    expect(categoryHeader("personal")).toBe("## Personal");
    expect(categoryHeader("work_education")).toBe("## Work & Education");
    expect(categoryHeader("preferences")).toBe("## Preferences");
    expect(categoryHeader("schedule")).toBe("## Schedule");
    expect(categoryHeader("interests")).toBe("## Interests");
    expect(categoryHeader("general")).toBe("## General");
  });
});

describe("appendToCategory", () => {
  it("appends to an existing section", () => {
    const file = "## Personal\n- Name: Ahmad";
    const result = appendToCategory(file, "personal", "- Age: 30");
    expect(result).toContain("## Personal");
    expect(result).toContain("- Name: Ahmad");
    expect(result).toContain("- Age: 30");
  });

  it("appends to existing section with multiple sections", () => {
    const file = "## Personal\n- Name: Ahmad\n\n## Preferences\n- Likes coffee";
    const result = appendToCategory(file, "personal", "- Age: 30");
    expect(result).toContain("- Name: Ahmad\n- Age: 30");
    expect(result).toContain("## Preferences\n- Likes coffee");
  });

  it("creates a missing section on an empty file", () => {
    const result = appendToCategory("", "personal", "- Name: Ahmad");
    expect(result).toBe("## Personal\n- Name: Ahmad");
  });

  it("creates a missing section in correct canonical order (before later sections)", () => {
    const file = "## Preferences\n- Likes tea";
    const result = appendToCategory(file, "personal", "- Name: Ahmad");
    const personalIdx = result.indexOf("## Personal");
    const preferencesIdx = result.indexOf("## Preferences");
    expect(personalIdx).toBeLessThan(preferencesIdx);
  });

  it("creates a missing section at the end when no later section exists", () => {
    const file = "## Personal\n- Name: Ahmad";
    const result = appendToCategory(file, "general", "- Note: test");
    expect(result).toContain("## Personal\n- Name: Ahmad");
    expect(result).toContain("## General\n- Note: test");
    const personalIdx = result.indexOf("## Personal");
    const generalIdx = result.indexOf("## General");
    expect(generalIdx).toBeGreaterThan(personalIdx);
  });

  it("maintains canonical order when inserting between sections", () => {
    const file = "## Personal\n- Name: Ahmad\n\n## Interests\n- Football";
    const result = appendToCategory(file, "schedule", "- Meeting Monday 9am");
    const personalIdx = result.indexOf("## Personal");
    const scheduleIdx = result.indexOf("## Schedule");
    const interestsIdx = result.indexOf("## Interests");
    expect(personalIdx).toBeLessThan(scheduleIdx);
    expect(scheduleIdx).toBeLessThan(interestsIdx);
  });
});

describe("editMemoryContent", () => {
  it("replaces existing text", () => {
    const file = "## Personal\n- Name: Ahmad\n- Age: 30";
    const { updated, found } = editMemoryContent(file, "- Age: 30", "- Age: 31");
    expect(found).toBe(true);
    expect(updated).toContain("- Age: 31");
    expect(updated).not.toContain("- Age: 30");
  });

  it("deletes text when replacement is empty", () => {
    const file = "## Personal\n- Name: Ahmad\n- Old fact";
    const { updated, found } = editMemoryContent(file, "- Old fact", "");
    expect(found).toBe(true);
    expect(updated).not.toContain("- Old fact");
    expect(updated).toContain("- Name: Ahmad");
  });

  it("returns found=false when search text is not found", () => {
    const file = "## Personal\n- Name: Ahmad";
    const { updated, found } = editMemoryContent(file, "nonexistent text", "replacement");
    expect(found).toBe(false);
    expect(updated).toBe(file);
  });

  it("cleans up excess blank lines after deletion", () => {
    const file = "## Personal\n- Name: Ahmad\n\n\n\n- Age: 30";
    const { updated } = editMemoryContent(file, "- Name: Ahmad", "");
    // Should not have more than 2 consecutive newlines
    expect(updated).not.toMatch(/\n{3,}/);
  });
});

describe("needsCompaction", () => {
  it("returns false for content under threshold", () => {
    expect(needsCompaction("short", 1000)).toBe(false);
  });

  it("returns true for content over threshold", () => {
    const content = "a".repeat(1001);
    expect(needsCompaction(content, 1000)).toBe(true);
  });

  it("returns false for content at exactly threshold", () => {
    const content = "a".repeat(1000);
    expect(needsCompaction(content, 1000)).toBe(false);
  });

  it("accounts for multi-byte UTF-8 characters", () => {
    // Arabic "م" is 2 bytes in UTF-8
    // 500 chars = 1000 bytes (at threshold), 501 chars = 1002 bytes (over)
    expect(needsCompaction("م".repeat(500), 1000)).toBe(false);
    expect(needsCompaction("م".repeat(501), 1000)).toBe(true);
  });

  it("returns false for empty content", () => {
    expect(needsCompaction("", 1000)).toBe(false);
  });
});
