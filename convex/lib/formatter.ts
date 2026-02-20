/**
 * WhatsApp message formatter.
 * Converts markdown AI responses to WhatsApp-friendly plain text.
 */

export function formatForWhatsApp(text: string): string {
  let formatted = text;

  // 1. Strip code block markers (keep content)
  formatted = formatted.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
    return code.trim();
  });

  // Inline code: `code` → code
  formatted = formatted.replace(/`([^`]+)`/g, "$1");

  // 2. Convert bold: **text** or __text__ → *text* (WhatsApp bold)
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "*$1*");
  formatted = formatted.replace(/__([^_]+)__/g, "*$1*");

  // 3. Strip # headers
  formatted = formatted.replace(/^#{1,6}\s+/gm, "");

  // 4. Links: [text](url) → text
  formatted = formatted.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 5. List markers: * item → - item
  formatted = formatted.replace(/^\*\s+/gm, "- ");

  // 6. Strip blockquote > markers
  formatted = formatted.replace(/^>\s*/gm, "");

  // 7. Remove horizontal rules (---, ***, ___)
  formatted = formatted.replace(/^[-*_]{3,}$/gm, "");

  // 8. Collapse 3+ blank lines → 1
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  // 9. Trim
  formatted = formatted.trim();

  return formatted;
}
