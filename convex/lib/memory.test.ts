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
  it("has 4 categories", () => {
    expect(Object.keys(MEMORY_CATEGORIES)).toHaveLength(4);
  });

  it("CATEGORY_ORDER includes all categories", () => {
    const keys = Object.keys(MEMORY_CATEGORIES).sort();
    const ordered = [...CATEGORY_ORDER].sort();
    expect(ordered).toEqual(keys);
  });
});

describe("categoryHeader", () => {
  it("returns ## header for each category", () => {
    expect(categoryHeader("preferences")).toBe("## Preferences");
    expect(categoryHeader("schedule")).toBe("## Schedule");
    expect(categoryHeader("interests")).toBe("## Interests");
    expect(categoryHeader("general")).toBe("## General");
  });
});

describe("appendToCategory", () => {
  it("appends to an existing section", () => {
    const file = "## Preferences\n- Likes coffee";
    const result = appendToCategory(file, "preferences", "- Prefers mornings");
    expect(result).toContain("## Preferences");
    expect(result).toContain("- Likes coffee");
    expect(result).toContain("- Prefers mornings");
  });

  it("appends to existing section with multiple sections", () => {
    const file = "## Preferences\n- Likes coffee\n\n## General\n- Note";
    const result = appendToCategory(file, "preferences", "- Prefers mornings");
    expect(result).toContain("- Likes coffee\n- Prefers mornings");
    expect(result).toContain("## General\n- Note");
  });

  it("creates a missing section on an empty file", () => {
    const result = appendToCategory("", "preferences", "- Likes coffee");
    expect(result).toBe("## Preferences\n- Likes coffee");
  });

  it("creates a missing section in correct canonical order (before later sections)", () => {
    const file = "## General\n- Note";
    const result = appendToCategory(file, "preferences", "- Likes coffee");
    const preferencesIdx = result.indexOf("## Preferences");
    const generalIdx = result.indexOf("## General");
    expect(preferencesIdx).toBeLessThan(generalIdx);
  });

  it("creates a missing section at the end when no later section exists", () => {
    const file = "## Preferences\n- Likes coffee";
    const result = appendToCategory(file, "general", "- Note: test");
    expect(result).toContain("## Preferences\n- Likes coffee");
    expect(result).toContain("## General\n- Note: test");
    const preferencesIdx = result.indexOf("## Preferences");
    const generalIdx = result.indexOf("## General");
    expect(generalIdx).toBeGreaterThan(preferencesIdx);
  });

  it("maintains canonical order when inserting between sections", () => {
    const file = "## Preferences\n- Likes coffee\n\n## Interests\n- Football";
    const result = appendToCategory(file, "schedule", "- Meeting Monday 9am");
    const preferencesIdx = result.indexOf("## Preferences");
    const scheduleIdx = result.indexOf("## Schedule");
    const interestsIdx = result.indexOf("## Interests");
    expect(preferencesIdx).toBeLessThan(scheduleIdx);
    expect(scheduleIdx).toBeLessThan(interestsIdx);
  });
});

describe("editMemoryContent", () => {
  it("replaces existing text", () => {
    const file = "## Preferences\n- Likes coffee\n- Prefers mornings";
    const { updated, found } = editMemoryContent(file, "- Prefers mornings", "- Prefers evenings");
    expect(found).toBe(true);
    expect(updated).toContain("- Prefers evenings");
    expect(updated).not.toContain("- Prefers mornings");
  });

  it("deletes text when replacement is empty", () => {
    const file = "## General\n- Name: Ahmad\n- Old fact";
    const { updated, found } = editMemoryContent(file, "- Old fact", "");
    expect(found).toBe(true);
    expect(updated).not.toContain("- Old fact");
    expect(updated).toContain("- Name: Ahmad");
  });

  it("returns found=false when search is empty string", () => {
    const file = "## Preferences\n- Likes coffee";
    const { updated, found } = editMemoryContent(file, "", "injected");
    expect(found).toBe(false);
    expect(updated).toBe(file);
  });

  it("returns found=false when search is whitespace only", () => {
    const file = "## Preferences\n- Likes coffee";
    const { updated, found } = editMemoryContent(file, "   ", "injected");
    expect(found).toBe(false);
    expect(updated).toBe(file);
  });

  it("returns found=false when search text is not found", () => {
    const file = "## Preferences\n- Likes coffee";
    const { updated, found } = editMemoryContent(file, "nonexistent text", "replacement");
    expect(found).toBe(false);
    expect(updated).toBe(file);
  });

  it("cleans up excess blank lines after deletion", () => {
    const file = "## General\n- Name: Ahmad\n\n\n\n- Age: 30";
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
