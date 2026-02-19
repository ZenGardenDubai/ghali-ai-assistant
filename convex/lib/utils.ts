/**
 * Pure utility functions — zero dependencies, trivially testable.
 */

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

const SYSTEM_COMMANDS = new Set([
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

export function isSystemCommand(message: string): boolean {
  return SYSTEM_COMMANDS.has(message.toLowerCase().trim());
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

const WHATSAPP_MAX_LENGTH = 4096;

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
