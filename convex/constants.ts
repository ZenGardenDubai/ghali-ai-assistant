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
export const PRO_PLAN_PRICE_USD = 19;

// ============================================================================
// Storage & Retention
// ============================================================================

/** Generated images expire after 90 days */
export const IMAGE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Incoming media files (images, PDFs, docs) expire after 90 days */
export const MEDIA_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Max per-user file size in bytes (10KB) — memory, personality, heartbeat */
export const MAX_USER_FILE_SIZE = 10_240;

/** Document storage limit for basic tier (100MB) */
export const STORAGE_LIMIT_BASIC_MB = 100;

/** Document storage limit for pro tier (500MB) */
export const STORAGE_LIMIT_PRO_MB = 500;

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
