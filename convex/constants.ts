/**
 * Business Constants — Single Source of Truth
 *
 * All business rules, limits, and configuration values are defined here.
 * Never hardcode these values anywhere else in the codebase.
 *
 * See docs/BUSINESS_RULES.md for full documentation.
 */

// ============================================================================
// Credit System
// ============================================================================

/** Credits per month for basic (free) tier */
export const CREDITS_BASIC = 60;

/** Credits per month for pro tier */
export const CREDITS_PRO = 600;

/** Credits deducted per AI request */
export const CREDITS_PER_REQUEST = 1;

/** Credit reset period in milliseconds (30 days) */
export const CREDIT_RESET_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

// ============================================================================
// Pricing
// ============================================================================

/** Pro plan monthly price in USD */
export const PRO_PLAN_PRICE_MONTHLY_USD = 9.99;

/** Pro plan annual price in USD ($8.29/month equivalent) */
export const PRO_PLAN_PRICE_ANNUAL_USD = 99.48;

// ============================================================================
// Storage & Retention
// ============================================================================

/** Generated images expire after 90 days */
export const IMAGE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Incoming media files (images, PDFs, docs) expire after 90 days */
export const MEDIA_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Max per-user file size in bytes (10KB) — memory, personality, heartbeat */
export const MAX_USER_FILE_SIZE = 10_240;

// ============================================================================
// WhatsApp & Messaging
// ============================================================================

/**
 * Max characters per WhatsApp message segment.
 * Twilio sandbox = 1600, production = 4096. Set to 1500 for safety.
 */
export const WHATSAPP_MAX_LENGTH = 1500;

/** Delay between multi-part Twilio messages (ms) to preserve ordering */
export const TWILIO_MESSAGE_DELAY_MS = 500;

// ============================================================================
// Voice Notes
// ============================================================================

/** Minimum audio file size (1KB) — smaller files are rejected as too short */
export const VOICE_MIN_SIZE_BYTES = 1024;

/** Maximum audio file size (25MB) — Whisper API limit */
export const VOICE_MAX_SIZE_BYTES = 25 * 1024 * 1024;

// ============================================================================
// Agent Configuration
// ============================================================================

/** Max tool-call steps per agent turn */
export const AGENT_MAX_STEPS = 5;

/** Number of recent thread messages loaded into context */
export const AGENT_RECENT_MESSAGES = 50;

/** Default image aspect ratio (portrait, optimized for phones) */
export const DEFAULT_IMAGE_ASPECT_RATIO = "9:16" as const;

/** Maximum prompt length for image generation (chars) */
export const IMAGE_PROMPT_MAX_LENGTH = 2000;

// ============================================================================
// Onboarding Heuristics
// ============================================================================

/** Messages with this many words or fewer are treated as onboarding replies */
export const ONBOARDING_SHORT_MESSAGE_WORDS = 4;

/** Messages with this many words or more bypass onboarding (real questions) */
export const ONBOARDING_LONG_MESSAGE_WORDS = 8;

// ============================================================================
// Document Processing & RAG
// ============================================================================

/** Minimum media file size (1KB) — smaller files are rejected as empty */
export const MEDIA_MIN_SIZE_BYTES = 1024;

/** Maximum media file size (20MB) — WhatsApp caps at 16MB, buffer for overhead */
export const MEDIA_MAX_SIZE_BYTES = 20 * 1024 * 1024;

/** Pending action expiry time (5 minutes) — confirmation must come within this window */
export const PENDING_ACTION_EXPIRY_MS = 5 * 60 * 1000;

/** Maximum extracted text length (50K chars) — truncated beyond this */
export const MAX_EXTRACTION_LENGTH = 50_000;

/** CloudConvert API timeout (30s) */
export const CLOUDCONVERT_TIMEOUT_MS = 30_000;

// ============================================================================
// Pro Features (used in upgrade template)
// ============================================================================

/** Pro-exclusive features — displayed in the upgrade message. Add new features here. */
export const PRO_FEATURES = [
  "600 credits/month (10x Basic)",
  "Precise scheduling — set reminders down to the minute",
  "Heartbeat — proactive check-ins",
] as const;

// ============================================================================
// Rate Limiting
// ============================================================================

/** Max messages per minute per user */
export const RATE_LIMIT_MESSAGES_PER_MINUTE = 30;

/** Burst capacity — allows short bursts above the steady rate */
export const RATE_LIMIT_BURST_CAPACITY = 40;

// ============================================================================
// Heartbeat
// ============================================================================

/** WhatsApp session window (24 hours) — can only send free-form messages within this window */
export const WHATSAPP_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Reminders
// ============================================================================

/** Maximum pending reminders per user */
export const MAX_REMINDERS_PER_USER = 25;

/** Credit threshold for low-credit warning (fires once when balance crosses below) */
export const CREDITS_LOW_THRESHOLD = 10;

// ============================================================================
// Security
// ============================================================================

/** Maximum WhatsApp message body length (truncate beyond this to prevent cost amplification) */
export const MAX_MESSAGE_LENGTH = 10_000;

/** TTL for processed webhook dedup entries (24 hours) */
export const WEBHOOK_DEDUP_TTL_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Geography & Localization
// ============================================================================

/** Default timezone for new users and fallback */
export const DEFAULT_TIMEZONE = "Asia/Dubai";

/** Phone country code → IANA timezone mapping */
export const COUNTRY_CODE_TIMEZONES: Record<string, string> = {
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

/** Country codes blocked from using the service */
export const BLOCKED_COUNTRY_CODES = [
  "+91", // India
  "+92", // Pakistan
  "+880", // Bangladesh
  "+234", // Nigeria
  "+62", // Indonesia
  "+263", // Zimbabwe
];

// ============================================================================
// System Commands
// ============================================================================

/** Recognized system commands (free, no credit deduction) */
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

// ============================================================================
// AI Models
// ============================================================================

/** Model API identifiers — single source of truth for all AI model strings */
export const MODELS = {
  /** Primary agent model — fast, cheap, handles ~85% of requests */
  FLASH: "gemini-3-flash-preview",
  /** Deep reasoning escalation — complex math, logic, analysis, coding */
  DEEP_REASONING: "claude-opus-4-6",
  /** Image generation model */
  IMAGE_GENERATION: "gemini-3-pro-image-preview",
  /** Text embedding model for RAG */
  EMBEDDING: "text-embedding-3-small",
} as const;
