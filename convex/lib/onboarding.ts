/**
 * Onboarding flow — pure async functions (no Convex deps).
 * Same pattern as systemCommands.ts: returns data, caller applies side effects.
 */

import {
  ONBOARDING_SHORT_MESSAGE_WORDS,
  ONBOARDING_LONG_MESSAGE_WORDS,
} from "../constants";

import { TEMPLATES } from "../templates";
import { fillTemplate } from "./utils";

// ============================================================================
// Types
// ============================================================================

export interface OnboardingResult {
  response: string;
  nextStep: number | null;
  updates?: { name?: string; timezone?: string; language?: string };
  fileUpdates?: { memory?: string; personality?: string };
  skipToAI?: boolean;
}

interface OnboardingUser {
  name?: string;
  timezone: string;
  language: string;
  credits: number;
}

// ============================================================================
// isRealQuestion — heuristic to detect if a message is a genuine question
// vs. a short onboarding reply (name, yes/no, style pick, etc.)
// ============================================================================

const QUESTION_STARTERS = /^(what|how|why|where|when|who|which|can|could|would|should|is|are|do|does|did|will|tell|explain|describe|write|translate|summarize|calculate|find|search|help|show|list|compare|analyze|create|generate|make|remind|set|schedule)\b/i;

const SHORT_REPLIES = /^(yes|no|yeah|yep|nah|nope|ok|okay|sure|skip|hi|hello|hey|thanks|thank you|نعم|لا|أوكي|حسنا|مرحبا|oui|non|merci|salut|sí|no|hola|gracias)$/i;

const PERSONALITY_WORDS = /^(cheerful|friendly|professional|serious|brief|concise|detailed|thorough|😊|📋|⚡|📚)$/i;

const LANGUAGE_WORDS = /^(english|arabic|french|العربية|عربي|français|francais|🇬🇧|🇦🇪|🇫🇷)$/i;

export function isRealQuestion(message: string): boolean {
  const trimmed = message.trim();

  // Short messages are likely onboarding replies unless they contain "?"
  const wordCount = trimmed.split(/\s+/).length;
  if (trimmed.includes("?")) return true;
  if (wordCount <= ONBOARDING_SHORT_MESSAGE_WORDS) {
    if (SHORT_REPLIES.test(trimmed)) return false;
    if (PERSONALITY_WORDS.test(trimmed)) return false;
    if (LANGUAGE_WORDS.test(trimmed)) return false;
    if (/^\d$/.test(trimmed)) return false; // single digit
    if (QUESTION_STARTERS.test(trimmed)) return true;
    return false; // short message, not a question starter → onboarding reply
  }

  // Longer messages: check for question patterns or imperative requests
  if (QUESTION_STARTERS.test(trimmed)) return true;

  // Long messages are likely real questions
  if (wordCount >= ONBOARDING_LONG_MESSAGE_WORDS) return true;

  return false;
}

// ============================================================================
// parsePersonalityReply
// ============================================================================

const PERSONALITY_OPTIONS = new Set(["cheerful", "professional", "brief", "detailed", "skip"]);

export async function parsePersonalityReply(reply: string): Promise<string | null> {
  const lower = reply.toLowerCase().trim();
  if (!lower) return null;

  // Fast path: exact English match or number/emoji
  if (lower === "skip" || /تخطي|passer|saltar/.test(lower)) return "skip";
  if (/cheerful|friendly|😊/.test(lower) || lower === "1") return "cheerful";
  if (/professional|serious|📋/.test(lower) || lower === "2") return "professional";
  if (/brief|concise|to the point|⚡/.test(lower) || lower === "3") return "brief";
  if (/detailed|thorough|📚/.test(lower) || lower === "4") return "detailed";

  // Non-English: use Flash to classify
  try {
    const { generateText } = await import("ai");
    const { google } = await import("@ai-sdk/google");
    const { MODELS } = await import("../models");

    const result = await generateText({
      model: google(MODELS.FLASH),
      temperature: 0,
      system: `Classify the user's personality preference. Options: cheerful, professional, brief, detailed, skip.
Return ONLY one of those words. If the message means:
- Happy/friendly/warm → cheerful
- Formal/serious/professional → professional
- Short/concise/brief/to-the-point → brief
- Detailed/thorough/comprehensive → detailed
- Skip/pass/later → skip
If it doesn't match any, return "none".`,
      prompt: lower,
    });

    const classification = result.text.toLowerCase().trim();
    return PERSONALITY_OPTIONS.has(classification) ? classification : null;
  } catch (error) {
    console.error("parsePersonalityReply classification failed:", error);
    return null;
  }
}

// ============================================================================
// parseLanguageReply
// ============================================================================

export function parseLanguageReply(reply: string): string | null {
  const lower = reply.toLowerCase().trim();

  // English
  if (/english|🇬🇧/.test(lower) || lower === "1") return "en";
  // Arabic
  if (/arabic|العربية|عربي|🇦🇪/.test(lower) || lower === "2") return "ar";
  // French
  if (/french|fran[çc]ais|🇫🇷/.test(lower) || lower === "3") return "fr";

  return null;
}

// ============================================================================
// DEFAULT_PERSONALITY — seeded for all new users at onboarding completion
// ============================================================================

export const DEFAULT_PERSONALITY = `# Preferences
- Tone: playful, bubbly, and helpful
- Verbosity: balanced
- Emoji: expressive and frequent
- Off-limits: none specified`;

export function buildDefaultPersonality(): string {
  return DEFAULT_PERSONALITY;
}

// ============================================================================
// CITY_TIMEZONES — common city → IANA timezone map
// ============================================================================

export const CITY_TIMEZONES: Record<string, string> = {
  // UAE
  dubai: "Asia/Dubai",
  "abu dhabi": "Asia/Dubai",
  sharjah: "Asia/Dubai",
  ajman: "Asia/Dubai",
  // Middle East
  riyadh: "Asia/Riyadh",
  jeddah: "Asia/Riyadh",
  mecca: "Asia/Riyadh",
  medina: "Asia/Riyadh",
  kuwait: "Asia/Kuwait",
  "kuwait city": "Asia/Kuwait",
  doha: "Asia/Qatar",
  manama: "Asia/Bahrain",
  muscat: "Asia/Muscat",
  amman: "Asia/Amman",
  beirut: "Asia/Beirut",
  cairo: "Africa/Cairo",
  baghdad: "Asia/Baghdad",
  tehran: "Asia/Tehran",
  jerusalem: "Asia/Jerusalem",
  "tel aviv": "Asia/Jerusalem",
  // Europe
  london: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  madrid: "Europe/Madrid",
  rome: "Europe/Rome",
  amsterdam: "Europe/Amsterdam",
  brussels: "Europe/Brussels",
  zurich: "Europe/Zurich",
  geneva: "Europe/Zurich",
  vienna: "Europe/Vienna",
  stockholm: "Europe/Stockholm",
  oslo: "Europe/Oslo",
  copenhagen: "Europe/Copenhagen",
  helsinki: "Europe/Helsinki",
  moscow: "Europe/Moscow",
  istanbul: "Europe/Istanbul",
  athens: "Europe/Athens",
  warsaw: "Europe/Warsaw",
  prague: "Europe/Prague",
  budapest: "Europe/Budapest",
  lisbon: "Europe/Lisbon",
  // Asia
  beijing: "Asia/Shanghai",
  shanghai: "Asia/Shanghai",
  "hong kong": "Asia/Hong_Kong",
  tokyo: "Asia/Tokyo",
  seoul: "Asia/Seoul",
  singapore: "Asia/Singapore",
  mumbai: "Asia/Kolkata",
  delhi: "Asia/Kolkata",
  "new delhi": "Asia/Kolkata",
  bangalore: "Asia/Kolkata",
  chennai: "Asia/Kolkata",
  karachi: "Asia/Karachi",
  lahore: "Asia/Karachi",
  islamabad: "Asia/Karachi",
  dhaka: "Asia/Dhaka",
  colombo: "Asia/Colombo",
  kathmandu: "Asia/Kathmandu",
  kabul: "Asia/Kabul",
  "kuala lumpur": "Asia/Kuala_Lumpur",
  jakarta: "Asia/Jakarta",
  bangkok: "Asia/Bangkok",
  manila: "Asia/Manila",
  taipei: "Asia/Taipei",
  // Americas
  "new york": "America/New_York",
  "los angeles": "America/Los_Angeles",
  chicago: "America/Chicago",
  houston: "America/Chicago",
  dallas: "America/Chicago",
  phoenix: "America/Phoenix",
  "san francisco": "America/Los_Angeles",
  seattle: "America/Los_Angeles",
  miami: "America/New_York",
  boston: "America/New_York",
  toronto: "America/Toronto",
  vancouver: "America/Vancouver",
  montreal: "America/Toronto",
  "mexico city": "America/Mexico_City",
  "sao paulo": "America/Sao_Paulo",
  "rio de janeiro": "America/Sao_Paulo",
  "buenos aires": "America/Argentina/Buenos_Aires",
  bogota: "America/Bogota",
  lima: "America/Lima",
  santiago: "America/Santiago",
  // Africa
  lagos: "Africa/Lagos",
  nairobi: "Africa/Nairobi",
  johannesburg: "Africa/Johannesburg",
  "cape town": "Africa/Johannesburg",
  casablanca: "Africa/Casablanca",
  // Oceania
  sydney: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  brisbane: "Australia/Brisbane",
  perth: "Australia/Perth",
  auckland: "Pacific/Auckland",
};

/**
 * Resolve a city name or IANA timezone string to a valid IANA timezone.
 * Returns null if the city is unknown and the input is not a valid IANA zone.
 */
export function resolveCityToTimezone(input: string): string | null {
  const lower = input.toLowerCase().trim();

  // Check city map first
  if (CITY_TIMEZONES[lower]) {
    return CITY_TIMEZONES[lower];
  }

  // Try as a direct IANA timezone (e.g. "Asia/Dubai", "Europe/London")
  try {
    Intl.DateTimeFormat(undefined, { timeZone: input });
    return input;
  } catch {
    return null;
  }
}

// ============================================================================
// bootstrapPersonality — infer initial personality from first real message
// ============================================================================

/**
 * Silently detect personality signals from the user's first real message
 * and return updated personality content. Called once after onboarding.
 */
export function bootstrapPersonality(message: string): string {
  const words = message.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Emoji detection — standard emoji unicode ranges
  const hasEmoji = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(message);

  // Formal vocabulary signals
  const formalPattern =
    /\b(please|thank you|kindly|would you|could you|I would like|I am writing|I have a|sincerely|regards|greetings|good morning|good afternoon|good evening|dear)\b/i;
  const casualPattern =
    /\b(wanna|gonna|lol|btw|idk|omg|tbh|ngl|haha|ya|yep|nope|lemme|dunno|sup|hey|yo|wassup|chill|cool|awesome|dude)\b/i;

  const isFormal = formalPattern.test(message) && !casualPattern.test(message);

  // Determine fields based on signals
  const verbosity =
    wordCount <= 10 ? "concise, short answers" :
    wordCount >= 30 ? "detailed" :
    "balanced";

  const emoji = hasEmoji ? "expressive and frequent" : "minimal";

  const tone = isFormal ? "professional, formal" : "playful, bubbly, and helpful";

  return `# Preferences
- Tone: ${tone}
- Verbosity: ${verbosity}
- Emoji: ${emoji}
- Off-limits: none specified`;
}

// ============================================================================
// buildPersonalityContent — markdown for personality user block
// ============================================================================

const PERSONALITY_STYLES: Record<string, string> = {
  cheerful: `# Preferences
- Tone: playful, warm
- Emoji: lots
- Verbosity: balanced`,

  professional: `# Preferences
- Tone: formal, precise
- Emoji: minimal
- Verbosity: balanced`,

  brief: `# Preferences
- Tone: direct
- Verbosity: concise, short answers
- Emoji: minimal`,

  detailed: `# Preferences
- Tone: informative, thorough
- Verbosity: detailed, comprehensive
- Emoji: moderate`,
};

export function buildPersonalityContent(style: string): string {
  return PERSONALITY_STYLES[style] ?? "";
}

// ============================================================================
// buildOnboardingMemory — initial memory markdown
// ============================================================================

export function buildOnboardingMemory(name?: string): string {
  if (name) return `# User Memory\n- Name: ${name}`;
  return "# User Memory";
}

// ============================================================================
// formatTimezoneForDisplay — "Asia/Dubai" → "Dubai (GMT+4)"
// ============================================================================

export function formatTimezoneForDisplay(iana: string): string {
  if (iana === "UTC") return "UTC (GMT+0)";

  // Extract city name from IANA (e.g., "America/New_York" → "New York")
  const city = iana.split("/").pop()?.replace(/_/g, " ") ?? iana;

  // Get GMT offset
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: iana,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    const offset = tzPart?.value ?? "";
    return `${city} (${offset})`;
  } catch {
    return city;
  }
}

// ============================================================================
// handleOnboarding — main state machine
// ============================================================================

export async function handleOnboarding(
  step: number,
  body: string,
  user: OnboardingUser
): Promise<OnboardingResult> {
  const trimmed = body.trim();

  // At any step: if user sends a real question, skip to AI
  if (isRealQuestion(trimmed)) {
    return {
      response: "",
      nextStep: null,
      skipToAI: true,
    };
  }

  switch (step) {
    // Step 1: Send single welcome message (first message from new user)
    // Onboarding completes immediately — timezone/name are auto-detected,
    // language is detected from first real message, personality is learned organically.
    case 1: {
      const name = user.name || "there";
      const timezone = formatTimezoneForDisplay(user.timezone);
      const response = fillTemplate(TEMPLATES.onboarding_welcome.template, {
        name,
        timezone,
      });
      const fileUpdates: OnboardingResult["fileUpdates"] = {
        memory: buildOnboardingMemory(user.name?.trim() || undefined),
        personality: buildDefaultPersonality(),
      };
      return { response, nextStep: null, fileUpdates };
    }

    default:
      return { response: "", nextStep: null, skipToAI: true };
  }
}
