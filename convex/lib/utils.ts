/**
 * Pure utility functions — zero dependencies, trivially testable.
 */

import { WHATSAPP_MAX_LENGTH } from "../constants";

// Country code → IANA timezone mapping
const COUNTRY_CODE_TIMEZONES: Record<string, string> = {
  "+971": "Asia/Dubai",
  "+966": "Asia/Riyadh",
  "+973": "Asia/Bahrain",
  "+974": "Asia/Qatar",
  "+968": "Asia/Muscat",
  "+965": "Asia/Kuwait",
  "+44": "Europe/London",
  "+1": "America/New_York",
  "+33": "Europe/Paris",
  "+49": "Europe/Berlin",
  "+61": "Australia/Sydney",
  "+81": "Asia/Tokyo",
  "+86": "Asia/Shanghai",
  "+91": "Asia/Kolkata",
  "+92": "Asia/Karachi",
  "+20": "Africa/Cairo",
  "+27": "Africa/Johannesburg",
  "+55": "America/Sao_Paulo",
  "+7": "Europe/Moscow",
  "+82": "Asia/Seoul",
  "+90": "Europe/Istanbul",
  "+234": "Africa/Lagos",
  "+880": "Asia/Dhaka",
  "+62": "Asia/Jakarta",
  "+263": "Africa/Harare",
};

// Sorted by prefix length (longest first) so +971 matches before +97
const SORTED_PREFIXES = Object.keys(COUNTRY_CODE_TIMEZONES).sort(
  (a, b) => b.length - a.length
);

export function detectTimezone(phoneNumber: string): string {
  for (const prefix of SORTED_PREFIXES) {
    if (phoneNumber.startsWith(prefix)) {
      return COUNTRY_CODE_TIMEZONES[prefix];
    }
  }
  return "UTC";
}

export function canAfford(credits: number, cost: number): boolean {
  return credits >= cost;
}

export const SYSTEM_COMMANDS: ReadonlySet<string> = new Set([
  "credits",
  "help",
  "privacy",
  "upgrade",
  "account",
  "my memory",
  "clear memory",
  "clear documents",
  "clear everything",
]);

/** Max words for a message to be considered a potential command. */
const COMMAND_MAX_WORDS = 4;

/**
 * Quick check: is this message an exact English system command?
 * For non-English detection, use classifyCommand() which calls Flash.
 */
export function isSystemCommand(message: string): boolean {
  return SYSTEM_COMMANDS.has(message.toLowerCase().trim());
}

/**
 * Classify a message as a system command using Flash.
 * For English exact matches, returns immediately (no API call).
 * For short non-English messages, asks Flash to identify the command.
 * Returns the canonical English command or null if not a command.
 */
export async function classifyCommand(message: string): Promise<string | null> {
  const normalized = message.toLowerCase().trim();
  if (!normalized) return null;

  // Fast path: exact English match
  if (SYSTEM_COMMANDS.has(normalized)) return normalized;

  // Skip long messages — not commands
  const wordCount = normalized.split(/\s+/).length;
  if (wordCount > COMMAND_MAX_WORDS) return null;

  // Use Flash to classify
  try {
    const { generateText } = await import("ai");
    const { google } = await import("@ai-sdk/google");
    const { MODELS } = await import("../models");

    const commandList = Array.from(SYSTEM_COMMANDS).join(", ");
    const result = await generateText({
      model: google(MODELS.FLASH),
      temperature: 0,
      system: `You classify user messages as system commands. The available commands are: ${commandList}.

If the message means the same as one of these commands (in any language — Arabic, French, Spanish, Hindi, Urdu, etc.), return ONLY the exact English command. Examples:
- "مساعدة" or "المساعدة" or "ساعدني" → help
- "aide" or "ayuda" → help
- "رصيد" or "رصيدي" → credits
- "ترقية" or "الترقية" → upgrade
- "حسابي" or "compte" → account
- "خصوصية" → privacy
- "ذاكرتي" or "ma mémoire" → my memory
- "مسح الكل" or "effacer tout" → clear everything

If the message is NOT a command (it's a question, greeting, or conversation), return ONLY the word "none".
Return ONLY the command or "none", nothing else.`,
      prompt: normalized,
    });

    const classification = result.text.toLowerCase().trim();
    return SYSTEM_COMMANDS.has(classification) ? classification : null;
  } catch (error) {
    console.error("classifyCommand failed:", error);
    return null;
  }
}

export function isAdminCommand(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  return normalized.startsWith("admin ") && normalized.length > 6;
}

const AFFIRMATIVE_RESPONSES = new Set([
  "yes", "y", "نعم", "oui", "si", "confirm", "ok", "sure", "yep", "yeah",
  "haan", "ہاں", "jee", "جی", // Hindi/Urdu
]);

export function isAffirmative(message: string): boolean {
  return AFFIRMATIVE_RESPONSES.has(message.toLowerCase().trim());
}

const BLOCKED_COUNTRY_CODES = [
  "+91", // India
  "+92", // Pakistan
  "+880", // Bangladesh
  "+234", // Nigeria
  "+62", // Indonesia
  "+263", // Zimbabwe
];

export function isBlockedCountryCode(phone: string): boolean {
  return BLOCKED_COUNTRY_CODES.some((code) => phone.startsWith(code));
}

export function fillTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in variables)) {
      throw new Error(`Missing template variable: ${key}`);
    }
    return String(variables[key]);
  });
}


const DEFAULT_TIMEZONE = "Asia/Dubai";

export function getCurrentDateTime(timezone?: string): {
  date: string;
  time: string;
  tz: string;
} {
  let tz = timezone || DEFAULT_TIMEZONE;

  // Validate timezone by attempting to use it
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format();
  } catch {
    tz = DEFAULT_TIMEZONE;
  }

  const now = new Date();

  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: tz,
  }).format(now);

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(now);

  return { date, time, tz };
}

export function splitLongMessage(
  text: string,
  maxLength: number = WHATSAPP_MAX_LENGTH
): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // Try to split at paragraph boundary
    let splitIndex = remaining.lastIndexOf("\n\n", maxLength);

    // Fall back to sentence boundary
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = remaining.lastIndexOf(". ", maxLength);
      if (splitIndex !== -1) splitIndex += 1; // include the period
    }

    // Fall back to newline
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = remaining.lastIndexOf("\n", maxLength);
    }

    // Last resort: hard split at maxLength
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}
