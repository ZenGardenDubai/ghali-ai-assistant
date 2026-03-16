/**
 * Telegram message formatting and parsing utilities.
 * Converts AI markdown output to Telegram HTML mode.
 */
import { splitLongMessage } from "./utils";
import { TELEGRAM_MAX_CHUNKS } from "../constants";

/**
 * Escape HTML special characters for Telegram HTML parse mode.
 * Must be applied to user/AI text BEFORE wrapping in HTML tags.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Convert AI markdown output to Telegram HTML format.
 *
 * Supported Telegram HTML tags: <b>, <i>, <u>, <s>, <code>, <pre>,
 * <a href="...">, <blockquote>, <tg-spoiler>
 *
 * We use HTML instead of MarkdownV2 because MarkdownV2 requires escaping
 * 18+ special characters, which is too fragile for dynamic AI content.
 */
export function formatForTelegram(text: string): string {
  let formatted = text;

  // 1. Code blocks: ```lang\ncode``` → <pre><code class="language-lang">code</code></pre>
  formatted = formatted.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    (_match, lang: string, code: string) => {
      const escaped = escapeHtml(code.trim());
      if (lang) {
        return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
      }
      return `<pre>${escaped}</pre>`;
    }
  );

  // 2. Inline code: `code` → <code>code</code>
  formatted = formatted.replace(/`([^`]+)`/g, (_match, code: string) => {
    return `<code>${escapeHtml(code)}</code>`;
  });

  // 3. Bold: **text** or __text__ → <b>text</b>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  formatted = formatted.replace(/__([^_]+)__/g, "<b>$1</b>");

  // 4. List markers: * item or - item → • item
  // Must come BEFORE italic to prevent "* item" matching as italic "*...*"
  formatted = formatted.replace(/^[*\-]\s+/gm, "• ");

  // 5. Single *text* → <b>text</b> (matches WhatsApp convention — the AI uses * for bold)
  // No italic support via * — the AI was trained for WhatsApp where *text* = bold
  formatted = formatted.replace(/(?<![*])\*([^*\n]+)\*(?![*])/g, "<b>$1</b>");
  // _text_ → <i>text</i> (underscore italic still supported)
  formatted = formatted.replace(/(?<![_])_([^_\n]+)_(?![_])/g, "<i>$1</i>");

  // 6. Strikethrough: ~~text~~ → <s>text</s>
  formatted = formatted.replace(/~~([^~]+)~~/g, "<s>$1</s>");

  // 7. Links: [text](url) → <a href="url">text</a>
  // Sanitize quotes in URL to prevent malformed HTML attributes
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, text: string, url: string) =>
      `<a href="${url.replace(/"/g, "&quot;")}">${text}</a>`
  );

  // 8. Headers: # text → <b>text</b> (Telegram has no headers)
  formatted = formatted.replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>");

  // 9. Blockquotes: > text → <blockquote>text</blockquote>
  // Collect consecutive > lines into a single blockquote
  formatted = formatted.replace(
    /(?:^>\s?(.*)$\n?)+/gm,
    (match) => {
      const lines = match
        .split("\n")
        .map((line) => line.replace(/^>\s?/, ""))
        .filter((line) => line !== "");
      return `<blockquote>${lines.join("\n")}</blockquote>`;
    }
  );

  // 10. Numbered lists: keep as-is

  // 11. Horizontal rules: --- or *** → empty line
  formatted = formatted.replace(/^[-*_]{3,}$/gm, "");

  // 12. Collapse 3+ blank lines → 1
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  // 13. Escape remaining HTML-sensitive chars in non-tagged content
  // Must escape &, <, > that are NOT part of our HTML tags or existing entities.
  // First: escape bare & (not already part of known HTML entities)
  formatted = formatted.replace(/&(?!amp;|lt;|gt;|quot;)/g, "&amp;");
  // Then: escape stray < and > not part of our known HTML tags
  formatted = formatted.replace(
    /(<\/?(?:b|i|u|s|code|pre|a|blockquote|tg-spoiler)[^>]*>)|([<>])/g,
    (match, tag: string | undefined, char: string | undefined) => {
      if (tag) return tag; // keep valid HTML tags
      if (char === "<") return "&lt;";
      if (char === ">") return "&gt;";
      return match;
    }
  );

  return formatted.trim();
}

/**
 * Split a message into chunks suitable for Telegram.
 * Uses a lower effective limit (3800) to account for HTML tag overhead
 * (e.g., **bold** → <b>bold</b> adds 3 chars per instance).
 */
const TELEGRAM_EFFECTIVE_LIMIT = 3800;

export function splitForTelegram(text: string): string[] {
  return splitLongMessage(text, TELEGRAM_EFFECTIVE_LIMIT, TELEGRAM_MAX_CHUNKS);
}
