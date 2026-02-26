/**
 * Pure memory manipulation functions — no DB or LLM dependencies.
 *
 * Memory files are organized into 6 sections with ## headers.
 * These functions handle appending, editing, and compaction checks.
 */

export const MEMORY_CATEGORIES = {
  personal: "Personal",
  work_education: "Work & Education",
  preferences: "Preferences",
  schedule: "Schedule",
  interests: "Interests",
  general: "General",
} as const;

export type MemoryCategory = keyof typeof MEMORY_CATEGORIES;

/** Canonical order for sections in the memory file */
export const CATEGORY_ORDER: readonly MemoryCategory[] = [
  "personal",
  "work_education",
  "preferences",
  "schedule",
  "interests",
  "general",
] as const;

/** Returns the ## header string for a category */
export function categoryHeader(cat: MemoryCategory): string {
  return `## ${MEMORY_CATEGORIES[cat]}`;
}

/**
 * Append content to a specific category section in the memory file.
 * Creates the section in the correct canonical order if it doesn't exist.
 */
export function appendToCategory(
  fileContent: string,
  category: MemoryCategory,
  newContent: string
): string {
  const trimmedContent = newContent.trim();
  if (!trimmedContent) return fileContent;

  const header = categoryHeader(category);
  const headerIdx = fileContent.indexOf(header);

  if (headerIdx !== -1) {
    // Section exists — find the end (next ## header or EOF)
    const afterHeader = headerIdx + header.length;
    const nextSectionIdx = findNextSection(fileContent, afterHeader);

    const before = fileContent.substring(0, nextSectionIdx);
    const after = fileContent.substring(nextSectionIdx);

    // Ensure proper spacing before appending
    const trimmedBefore = before.trimEnd();
    return `${trimmedBefore}\n${trimmedContent}\n${after.length > 0 ? "\n" + after.trimStart() : ""}`.trimEnd();
  }

  // Section doesn't exist — create it in canonical order
  return insertSectionInOrder(fileContent, category, trimmedContent);
}

/**
 * Find-and-replace in memory content (first occurrence only).
 * Empty replacement = delete the matched text.
 */
export function editMemoryContent(
  fileContent: string,
  search: string,
  replacement: string
): { updated: string; found: boolean } {
  if (!fileContent.includes(search)) {
    return { updated: fileContent, found: false };
  }

  let updated = fileContent.replace(search, replacement);

  // Clean up double blank lines that may result from deletions
  updated = updated.replace(/\n{3,}/g, "\n\n").trim();

  return { updated, found: true };
}

/** Check if content exceeds the compaction threshold (in bytes) */
export function needsCompaction(content: string, thresholdBytes: number): boolean {
  return new TextEncoder().encode(content).byteLength > thresholdBytes;
}

// ============================================================================
// Helpers
// ============================================================================

/** Find the index of the next ## header after the given position */
function findNextSection(content: string, afterPos: number): number {
  const nextIdx = content.indexOf("\n## ", afterPos);
  if (nextIdx === -1) return content.length;
  return nextIdx;
}

/** Insert a new section in canonical order within the file */
function insertSectionInOrder(
  fileContent: string,
  category: MemoryCategory,
  content: string
): string {
  const catIdx = CATEGORY_ORDER.indexOf(category);
  const newSection = `${categoryHeader(category)}\n${content}`;

  if (fileContent.trim() === "") {
    return newSection;
  }

  // Find the first existing section that comes AFTER this category in canonical order
  for (let i = catIdx + 1; i < CATEGORY_ORDER.length; i++) {
    const laterHeader = categoryHeader(CATEGORY_ORDER[i]!);
    const laterIdx = fileContent.indexOf(laterHeader);
    if (laterIdx !== -1) {
      // Insert before this later section
      const before = fileContent.substring(0, laterIdx).trimEnd();
      const after = fileContent.substring(laterIdx);
      return `${before}\n\n${newSection}\n\n${after}`.trimEnd();
    }
  }

  // No later section found — append at the end
  return `${fileContent.trimEnd()}\n\n${newSection}`;
}
