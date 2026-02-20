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
import { detectLanguage } from "./systemCommands";

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

const QUESTION_STARTERS = /^(what|how|why|where|when|who|which|can|could|would|should|is|are|do|does|did|will|tell|explain|describe|write|translate|summarize|calculate|find|search|help|show|list|compare|analyze|create|generate|make)\b/i;

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

export function parsePersonalityReply(reply: string): string | null {
  const lower = reply.toLowerCase().trim();

  if (lower === "skip") return "skip";

  // Cheerful
  if (/cheerful|friendly|😊/.test(lower) || lower === "1") return "cheerful";
  // Professional
  if (/professional|serious|📋/.test(lower) || lower === "2") return "professional";
  // Brief
  if (/brief|concise|to the point|⚡/.test(lower) || lower === "3") return "brief";
  // Detailed
  if (/detailed|thorough|📚/.test(lower) || lower === "4") return "detailed";

  return null;
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

export function buildOnboardingMemory(name: string): string {
  return `# User Memory\n- Name: ${name}`;
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
// parseName — extract name from step 2 reply
// ============================================================================

function parseName(reply: string): string | null {
  const lower = reply.toLowerCase().trim();

  // "call me X" / "call me X please"
  const callMe = lower.match(/^call me (.+?)(?:\s+please)?$/i);
  if (callMe) return callMe[1].trim();

  // "my name is X" / "I'm X" / "it's X"
  const nameIs = lower.match(
    /^(?:my name is|i'm|i am|it's|its|name is)\s+(.+)$/i
  );
  if (nameIs) return nameIs[1].trim();

  return null;
}

// ============================================================================
// parseTimezoneCorrection — detect city-based timezone corrections
// ============================================================================

const CITY_TIMEZONES: Record<string, string> = {
  london: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  "new york": "America/New_York",
  "los angeles": "America/Los_Angeles",
  chicago: "America/Chicago",
  toronto: "America/Toronto",
  dubai: "Asia/Dubai",
  "abu dhabi": "Asia/Dubai",
  riyadh: "Asia/Riyadh",
  cairo: "Africa/Cairo",
  tokyo: "Asia/Tokyo",
  sydney: "Australia/Sydney",
  mumbai: "Asia/Kolkata",
  singapore: "Asia/Singapore",
  "hong kong": "Asia/Hong_Kong",
  istanbul: "Europe/Istanbul",
  moscow: "Europe/Moscow",
  "sao paulo": "America/Sao_Paulo",
  shanghai: "Asia/Shanghai",
  beijing: "Asia/Shanghai",
  seoul: "Asia/Seoul",
  doha: "Asia/Qatar",
  bahrain: "Asia/Bahrain",
  kuwait: "Asia/Kuwait",
  muscat: "Asia/Muscat",
  karachi: "Asia/Karachi",
  jakarta: "Asia/Jakarta",
};

function parseTimezoneCorrection(reply: string): string | null {
  const lower = reply.toLowerCase().trim();

  // "I'm in X" / "I live in X" / "I am in X"
  const inCity = lower.match(
    /(?:i'm in|i am in|i live in|im in|currently in|based in)\s+(.+)/i
  );
  if (inCity) {
    const city = inCity[1].trim();
    return CITY_TIMEZONES[city] ?? null;
  }

  // Direct city name check
  return CITY_TIMEZONES[lower] ?? null;
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
    // Step 1: Send welcome message (first message from new user)
    case 1: {
      const name = user.name || "there";
      const timezone = formatTimezoneForDisplay(user.timezone);
      const response = fillTemplate(TEMPLATES.onboarding_welcome.template, {
        name,
        timezone,
      });
      return { response, nextStep: 2 };
    }

    // Step 2: Parse name/timezone reply + detect language
    case 2: {
      const updates: OnboardingResult["updates"] = {};

      // Check for name change
      const newName = parseName(trimmed);
      if (newName) {
        updates.name = newName;
      }

      // Check for timezone correction
      const newTimezone = parseTimezoneCorrection(trimmed);
      if (newTimezone) {
        updates.timezone = newTimezone;
      }

      // Detect language from the reply
      const detectedLang = await detectLanguage(trimmed);

      if (detectedLang !== "en") {
        // Language is clear from their reply — skip the language question
        updates.language = detectedLang;
        const response = fillTemplate(
          TEMPLATES.onboarding_personality.template,
          {}
        );
        return { response, nextStep: 4, updates };
      }

      // Language ambiguous (English reply) — ask about language
      const response = fillTemplate(
        TEMPLATES.onboarding_language.template,
        {}
      );
      return { response, nextStep: 3, updates };
    }

    // Step 3: Parse language selection
    case 3: {
      const updates: OnboardingResult["updates"] = {};
      const lang = parseLanguageReply(trimmed);
      if (lang) {
        updates.language = lang;
      }
      // Move to personality regardless
      const response = fillTemplate(
        TEMPLATES.onboarding_personality.template,
        {}
      );
      return { response, nextStep: 4, updates };
    }

    // Step 4: Parse personality style
    case 4: {
      const style = parsePersonalityReply(trimmed);
      const fileUpdates: OnboardingResult["fileUpdates"] = {};

      if (style && style !== "skip") {
        fileUpdates.personality = buildPersonalityContent(style);
      }

      // Build memory from what we know
      const name = user.name || "there";
      fileUpdates.memory = buildOnboardingMemory(name);

      const response = fillTemplate(
        TEMPLATES.onboarding_complete.template,
        {}
      );

      return {
        response,
        nextStep: null, // done
        fileUpdates:
          fileUpdates.personality || fileUpdates.memory
            ? fileUpdates
            : undefined,
      };
    }

    default:
      return { response: "", nextStep: null, skipToAI: true };
  }
}
