/**
 * Profile — pure functions for structured identity facts using bullet-point sections.
 *
 * Format:
 * ```
 * ## Personal
 * - Name: Hesham Amiri
 * - Birthday: March 15
 *
 * ## Professional
 * - Title: Executive Director
 * - Company: Hub71
 * ```
 *
 * No compaction — identity facts are permanent. Section-replace semantics:
 * the agent replaces an entire section at once, which naturally deduplicates.
 */

export const PROFILE_CATEGORIES = {
  personal: "Personal",
  professional: "Professional",
  education: "Education",
  family: "Family",
  location: "Location",
  links: "Links",
  milestones: "Milestones",
} as const;

export type ProfileCategory = keyof typeof PROFILE_CATEGORIES;

export const PROFILE_CATEGORY_ORDER: readonly ProfileCategory[] = [
  "personal",
  "professional",
  "education",
  "family",
  "location",
  "links",
  "milestones",
] as const;

/**
 * Replace an entire section of the profile with new content.
 * - Section exists → replace its content
 * - Section doesn't exist → create it in canonical order
 * - Empty newContent → remove the section entirely
 */
export function replaceProfileSection(
  content: string,
  category: ProfileCategory,
  newSectionContent: string
): string {
  const trimmedNew = newSectionContent.trim();
  const headerName = PROFILE_CATEGORIES[category];
  const sections = parseProfileSections(content);

  if (trimmedNew === "") {
    // Remove the section
    sections.delete(headerName);
  } else {
    sections.set(headerName, trimmedNew);
  }

  return serializeInOrder(sections);
}

/**
 * Parse profile content into a Map of section name → raw section content.
 * Keys are the display names (e.g. "Personal", not "personal").
 */
export function parseProfileSections(content: string): Map<string, string> {
  const result = new Map<string, string>();
  if (!content.trim()) return result;

  let currentSection: string | null = null;
  let currentLines: string[] = [];

  for (const line of content.split("\n")) {
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      // Flush previous section
      if (currentSection !== null) {
        const body = currentLines.join("\n").trim();
        if (body) result.set(currentSection, body);
      }
      currentSection = headerMatch[1]!.trim();
      currentLines = [];
      continue;
    }
    if (currentSection !== null) {
      currentLines.push(line);
    }
  }

  // Flush last section
  if (currentSection !== null) {
    const body = currentLines.join("\n").trim();
    if (body) result.set(currentSection, body);
  }

  return result;
}

// ============================================================================
// Helpers
// ============================================================================

/** Serialize sections back to string in canonical order. */
function serializeInOrder(sections: Map<string, string>): string {
  const ordered: string[] = [];

  // First: sections in canonical order
  for (const cat of PROFILE_CATEGORY_ORDER) {
    const name = PROFILE_CATEGORIES[cat];
    const body = sections.get(name);
    if (body) {
      ordered.push(`## ${name}\n${body}`);
    }
  }

  // Then: any unknown sections (preserve user/agent-created ones)
  const knownNames = new Set<string>(
    PROFILE_CATEGORY_ORDER.map((c) => PROFILE_CATEGORIES[c])
  );
  for (const [name, body] of sections) {
    if (!knownNames.has(name) && body) {
      ordered.push(`## ${name}\n${body}`);
    }
  }

  return ordered.join("\n\n");
}
