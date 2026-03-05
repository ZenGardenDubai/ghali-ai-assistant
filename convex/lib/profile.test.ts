import { describe, it, expect } from "vitest";
import { parseProfile, upsertProfileEntry, removeProfileEntry } from "./profile";

describe("parseProfile", () => {
  it("returns empty map for empty string", () => {
    const result = parseProfile("");
    expect(result.size).toBe(0);
  });

  it("parses single category with entries", () => {
    const content = "## Personal\nname: Hesham Amiri\nbirthday: March 15";
    const result = parseProfile(content);
    expect(result.size).toBe(1);
    const personal = result.get("Personal");
    expect(personal).toBeDefined();
    expect(personal!.get("name")).toBe("Hesham Amiri");
    expect(personal!.get("birthday")).toBe("March 15");
  });

  it("parses multiple categories", () => {
    const content = "## Personal\nname: Hesham\n\n## Professional\ntitle: Director";
    const result = parseProfile(content);
    expect(result.size).toBe(2);
    expect(result.get("Personal")!.get("name")).toBe("Hesham");
    expect(result.get("Professional")!.get("title")).toBe("Director");
  });

  it("handles colons in values (URLs)", () => {
    const content = "## Links\nwebsite: https://example.com/path?q=1";
    const result = parseProfile(content);
    expect(result.get("Links")!.get("website")).toBe("https://example.com/path?q=1");
  });

  it("trims whitespace from keys and values", () => {
    const content = "## Personal\n  name  :  Hesham Amiri  ";
    const result = parseProfile(content);
    expect(result.get("Personal")!.get("name")).toBe("Hesham Amiri");
  });

  it("ignores entries before any category header", () => {
    const content = "name: Orphan\n\n## Personal\nname: Hesham";
    const result = parseProfile(content);
    expect(result.size).toBe(1);
    expect(result.get("Personal")!.get("name")).toBe("Hesham");
  });

  it("skips blank lines and non-entry lines", () => {
    const content = "## Personal\n\nname: Hesham\n\nsome random text\nbirthday: March 15";
    const result = parseProfile(content);
    const personal = result.get("Personal")!;
    expect(personal.get("name")).toBe("Hesham");
    expect(personal.get("birthday")).toBe("March 15");
    expect(personal.size).toBe(2);
  });
});

describe("upsertProfileEntry", () => {
  it("creates category and entry on empty content", () => {
    const result = upsertProfileEntry("", "Personal", "name", "Hesham");
    expect(result).toBe("## Personal\nname: Hesham");
  });

  it("adds entry to existing category", () => {
    const content = "## Personal\nname: Hesham";
    const result = upsertProfileEntry(content, "Personal", "birthday", "March 15");
    expect(result).toContain("name: Hesham");
    expect(result).toContain("birthday: March 15");
  });

  it("creates new category when needed", () => {
    const content = "## Personal\nname: Hesham";
    const result = upsertProfileEntry(content, "Professional", "title", "Director");
    expect(result).toContain("## Personal\nname: Hesham");
    expect(result).toContain("## Professional\ntitle: Director");
  });

  it("replaces existing key value", () => {
    const content = "## Personal\nname: Hesham\nbirthday: March 15";
    const result = upsertProfileEntry(content, "Personal", "name", "Ahmed");
    expect(result).toContain("name: Ahmed");
    expect(result).not.toContain("Hesham");
  });

  it("deletes key when value is empty string", () => {
    const content = "## Personal\nname: Hesham\nbirthday: March 15";
    const result = upsertProfileEntry(content, "Personal", "name", "");
    expect(result).not.toContain("name:");
    expect(result).toContain("birthday: March 15");
  });

  it("removes empty section after deletion", () => {
    const content = "## Personal\nname: Hesham\n\n## Professional\ntitle: Director";
    const result = upsertProfileEntry(content, "Personal", "name", "");
    expect(result).not.toContain("## Personal");
    expect(result).toContain("## Professional\ntitle: Director");
  });

  it("handles case-insensitive key matching", () => {
    const content = "## Personal\nName: Hesham";
    const result = upsertProfileEntry(content, "Personal", "name", "Ahmed");
    expect(result).toContain("name: Ahmed");
    expect(result).not.toContain("Name: Hesham");
  });

  it("handles values with colons", () => {
    const content = "## Links\nwebsite: https://old.com";
    const result = upsertProfileEntry(content, "Links", "website", "https://new.com");
    expect(result).toContain("website: https://new.com");
    expect(result).not.toContain("old.com");
  });

  it("sanitizes category with ## prefix", () => {
    const result = upsertProfileEntry("", "## Personal", "name", "Hesham");
    expect(result).toBe("## Personal\nname: Hesham");
    expect(result).not.toContain("## ## Personal");
  });

  it("sanitizes key with colons and newlines", () => {
    const result = upsertProfileEntry("", "Personal", "na:me\nfake", "Hesham");
    expect(result).toContain("na me fake: Hesham");
  });

  it("sanitizes value with newlines", () => {
    const result = upsertProfileEntry("", "Personal", "name", "Line1\nLine2");
    expect(result).toContain("name: Line1 Line2");
    expect(result).not.toContain("\n\n");
  });
});

describe("removeProfileEntry", () => {
  it("removes existing key", () => {
    const content = "## Personal\nname: Hesham\nbirthday: March 15";
    const result = removeProfileEntry(content, "Personal", "name");
    expect(result.found).toBe(true);
    expect(result.updated).not.toContain("name:");
    expect(result.updated).toContain("birthday: March 15");
  });

  it("returns found=false for non-existent key", () => {
    const content = "## Personal\nname: Hesham";
    const result = removeProfileEntry(content, "Personal", "age");
    expect(result.found).toBe(false);
  });

  it("returns found=false for non-existent category", () => {
    const content = "## Personal\nname: Hesham";
    const result = removeProfileEntry(content, "Professional", "title");
    expect(result.found).toBe(false);
  });

  it("cleans up empty section after removal", () => {
    const content = "## Personal\nname: Hesham\n\n## Professional\ntitle: Director";
    const result = removeProfileEntry(content, "Personal", "name");
    expect(result.found).toBe(true);
    expect(result.updated).not.toContain("## Personal");
    expect(result.updated).toContain("## Professional");
  });
});
