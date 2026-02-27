/**
 * ProWrite — pure helper functions (testable in isolation).
 */

/**
 * Check if a user message is a ProWrite request.
 * Only activates when message starts with "prowrite" (case-insensitive)
 * followed by a word boundary.
 */
export function isProWriteRequest(message: string): boolean {
  return /^prowrite\b/i.test(message.trim());
}

/**
 * Extract keywords from an enriched brief for RAG search.
 * Takes the first 300 chars, removes punctuation, deduplicates, returns top 20 words.
 */
export function extractKeywordsFromBrief(brief: string): string {
  const words = brief
    .slice(0, 300)
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 20);
  return words.join(" ");
}

/**
 * Format a long article for WhatsApp delivery.
 * Trims whitespace — the messaging layer handles splitting at 1500 chars.
 */
export function formatArticleForWhatsApp(article: string): string {
  return article.trim();
}
