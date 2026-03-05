import { describe, it, expect } from "vitest";
import {
  replaceProfileSection,
  parseProfileSections,
  PROFILE_CATEGORIES,
  PROFILE_CATEGORY_ORDER,
} from "./profile";

describe("PROFILE_CATEGORIES", () => {
  it("has 6 categories", () => {
    expect(Object.keys(PROFILE_CATEGORIES)).toHaveLength(6);
  });

  it("PROFILE_CATEGORY_ORDER includes all categories", () => {
    const keys = Object.keys(PROFILE_CATEGORIES).sort();
    const ordered = [...PROFILE_CATEGORY_ORDER].sort();
    expect(ordered).toEqual(keys);
  });
});

describe("parseProfileSections", () => {
  it("returns empty map for empty string", () => {
    expect(parseProfileSections("").size).toBe(0);
  });

  it("returns empty map for whitespace-only", () => {
    expect(parseProfileSections("   \n  ").size).toBe(0);
  });

  it("parses single section", () => {
    const content = "## Personal\n- Name: Hesham Amiri\n- Birthday: March 15";
    const result = parseProfileSections(content);
    expect(result.size).toBe(1);
    expect(result.get("Personal")).toBe("- Name: Hesham Amiri\n- Birthday: March 15");
  });

  it("parses multiple sections", () => {
    const content =
      "## Personal\n- Name: Hesham\n\n## Professional\n- Title: Director";
    const result = parseProfileSections(content);
    expect(result.size).toBe(2);
    expect(result.get("Personal")).toBe("- Name: Hesham");
    expect(result.get("Professional")).toBe("- Title: Director");
  });

  it("ignores content before any header", () => {
    const content = "orphan line\n\n## Personal\n- Name: Hesham";
    const result = parseProfileSections(content);
    expect(result.size).toBe(1);
    expect(result.get("Personal")).toBe("- Name: Hesham");
  });

  it("skips sections with empty bodies", () => {
    const content = "## Personal\n\n## Professional\n- Title: Director";
    const result = parseProfileSections(content);
    expect(result.size).toBe(1);
    expect(result.get("Professional")).toBe("- Title: Director");
  });
});

describe("replaceProfileSection", () => {
  it("creates section on empty content", () => {
    const result = replaceProfileSection("", "personal", "- Name: Hesham");
    expect(result).toBe("## Personal\n- Name: Hesham");
  });

  it("creates section in canonical order (before later sections)", () => {
    const content = "## Professional\n- Title: Director";
    const result = replaceProfileSection(content, "personal", "- Name: Hesham");
    const personalIdx = result.indexOf("## Personal");
    const professionalIdx = result.indexOf("## Professional");
    expect(personalIdx).toBeLessThan(professionalIdx);
  });

  it("creates section in canonical order (after earlier sections)", () => {
    const content = "## Personal\n- Name: Hesham";
    const result = replaceProfileSection(content, "links", "- Website: https://example.com");
    const personalIdx = result.indexOf("## Personal");
    const linksIdx = result.indexOf("## Links");
    expect(linksIdx).toBeGreaterThan(personalIdx);
  });

  it("replaces existing section content entirely", () => {
    const content =
      "## Personal\n- Name: Hesham\n- Birthday: March 15\n\n## Professional\n- Title: Director";
    const result = replaceProfileSection(
      content,
      "personal",
      "- Name: Ahmed\n- Nationality: Emirati"
    );
    expect(result).toContain("- Name: Ahmed");
    expect(result).toContain("- Nationality: Emirati");
    expect(result).not.toContain("Hesham");
    expect(result).not.toContain("Birthday");
    // Professional section preserved
    expect(result).toContain("## Professional\n- Title: Director");
  });

  it("removes section when content is empty", () => {
    const content =
      "## Personal\n- Name: Hesham\n\n## Professional\n- Title: Director";
    const result = replaceProfileSection(content, "personal", "");
    expect(result).not.toContain("## Personal");
    expect(result).toContain("## Professional\n- Title: Director");
  });

  it("removes section when content is whitespace", () => {
    const content = "## Personal\n- Name: Hesham";
    const result = replaceProfileSection(content, "personal", "   \n  ");
    expect(result).toBe("");
  });

  it("maintains canonical order across all 6 categories", () => {
    let content = "";
    // Add in reverse order
    content = replaceProfileSection(content, "links", "- Website: https://example.com");
    content = replaceProfileSection(content, "location", "- City: Abu Dhabi");
    content = replaceProfileSection(content, "family", "- Spouse: Sara");
    content = replaceProfileSection(content, "education", "- Degree: MBA");
    content = replaceProfileSection(content, "professional", "- Title: Director");
    content = replaceProfileSection(content, "personal", "- Name: Hesham");

    const personalIdx = content.indexOf("## Personal");
    const professionalIdx = content.indexOf("## Professional");
    const educationIdx = content.indexOf("## Education");
    const familyIdx = content.indexOf("## Family");
    const locationIdx = content.indexOf("## Location");
    const linksIdx = content.indexOf("## Links");

    expect(personalIdx).toBeLessThan(professionalIdx);
    expect(professionalIdx).toBeLessThan(educationIdx);
    expect(educationIdx).toBeLessThan(familyIdx);
    expect(familyIdx).toBeLessThan(locationIdx);
    expect(locationIdx).toBeLessThan(linksIdx);
  });

  it("handles multi-line bullet content", () => {
    const result = replaceProfileSection(
      "",
      "personal",
      "- Name: Hesham Amiri\n- Birthday: March 15\n- Nationality: Emirati\n- Languages: Arabic, English"
    );
    expect(result).toContain("- Name: Hesham Amiri");
    expect(result).toContain("- Languages: Arabic, English");
  });

  it("trims content before storing", () => {
    const result = replaceProfileSection("", "personal", "  - Name: Hesham  \n  ");
    expect(result).toBe("## Personal\n- Name: Hesham");
  });

  it("preserves unknown sections from other sources", () => {
    const content = "## Personal\n- Name: Hesham\n\n## Custom\n- Note: something";
    const result = replaceProfileSection(content, "professional", "- Title: Director");
    expect(result).toContain("## Personal");
    expect(result).toContain("## Professional");
    expect(result).toContain("## Custom");
    // Custom comes after all known sections
    const professionalIdx = result.indexOf("## Professional");
    const customIdx = result.indexOf("## Custom");
    expect(customIdx).toBeGreaterThan(professionalIdx);
  });
});
