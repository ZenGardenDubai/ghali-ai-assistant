/**
 * Profile — pure functions for parsing and upserting identity facts.
 *
 * Format:
 * ```
 * ## Personal
 * name: Hesham Amiri
 * birthday: March 15
 *
 * ## Professional
 * title: Executive Director
 * ```
 */

/**
 * Parse profile content into a nested Map: category → (key → value).
 */
export function parseProfile(content: string): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>();
  if (!content.trim()) return result;

  let currentCategory: string | null = null;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Category header
    const headerMatch = trimmed.match(/^##\s+(.+)$/);
    if (headerMatch) {
      currentCategory = headerMatch[1]!.trim();
      if (!result.has(currentCategory)) {
        result.set(currentCategory, new Map());
      }
      continue;
    }

    // Key: value entry (split on FIRST colon only)
    if (currentCategory && trimmed.includes(":")) {
      const colonIdx = trimmed.indexOf(":");
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();
      if (key) {
        result.get(currentCategory)!.set(key, value);
      }
    }
  }

  return result;
}

/** Find existing category name by case-insensitive match. */
function findCategoryName(
  parsed: Map<string, Map<string, string>>,
  category: string
): string | null {
  const target = category.toLowerCase();
  for (const existing of parsed.keys()) {
    if (existing.toLowerCase() === target) return existing;
  }
  return null;
}

/**
 * Upsert a key-value entry in the profile.
 * - Key exists → replace value (case-insensitive match, preserves new casing)
 * - New key → add to category
 * - Empty value → delete key
 * - New category → create section
 */
export function upsertProfileEntry(
  content: string,
  category: string,
  key: string,
  value: string
): string {
  // Sanitize inputs to prevent format corruption
  category = category.replace(/^#+\s*/, "").replace(/\n/g, " ").trim();
  key = key.replace(/[:\n]/g, " ").replace(/\s+/g, " ").trim();
  value = value.replace(/\n/g, " ").trim();

  if (!category) {
    throw new Error("Profile category cannot be empty.");
  }
  if (!key) {
    throw new Error("Profile key cannot be empty.");
  }

  // Delete case
  if (value === "") {
    const { updated } = removeProfileEntry(content, category, key);
    return updated;
  }

  const parsed = parseProfile(content);
  const existingCategoryName = findCategoryName(parsed, category);
  const categoryName = existingCategoryName ?? category;
  const catMap = parsed.get(categoryName);

  if (catMap) {
    // Find existing key (case-insensitive)
    let existingKey: string | null = null;
    for (const k of catMap.keys()) {
      if (k.toLowerCase() === key.toLowerCase()) {
        existingKey = k;
        break;
      }
    }

    if (existingKey !== null) {
      catMap.delete(existingKey);
    }
    catMap.set(key, value);
  } else {
    const newMap = new Map<string, string>();
    newMap.set(key, value);
    parsed.set(categoryName, newMap);
  }

  return serializeProfile(parsed);
}

/**
 * Remove a key from the profile. Returns { updated, found }.
 * Cleans up empty sections.
 */
export function removeProfileEntry(
  content: string,
  category: string,
  key: string
): { updated: string; found: boolean } {
  const parsed = parseProfile(content);
  const existingCategoryName = findCategoryName(parsed, category);
  if (!existingCategoryName) {
    return { updated: content, found: false };
  }
  const catMap = parsed.get(existingCategoryName)!;

  // Case-insensitive key lookup
  let existingKey: string | null = null;
  for (const k of catMap.keys()) {
    if (k.toLowerCase() === key.toLowerCase()) {
      existingKey = k;
      break;
    }
  }

  if (existingKey === null) {
    return { updated: content, found: false };
  }

  catMap.delete(existingKey);

  // Remove empty category
  if (catMap.size === 0) {
    parsed.delete(existingCategoryName);
  }

  return { updated: serializeProfile(parsed), found: true };
}

/** Serialize a parsed profile back to string format. */
function serializeProfile(parsed: Map<string, Map<string, string>>): string {
  const sections: string[] = [];

  for (const [category, entries] of parsed) {
    if (entries.size === 0) continue;
    const lines = [`## ${category}`];
    for (const [key, value] of entries) {
      lines.push(`${key}: ${value}`);
    }
    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n");
}
