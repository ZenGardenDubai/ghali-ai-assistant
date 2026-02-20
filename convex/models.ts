/**
 * Model Constants — Single Source of Truth
 *
 * All model identifiers are defined here.
 * Never hardcode model strings anywhere else in the codebase.
 *
 * Cost tracking is handled by PostHog (not in-app).
 */

// ============================================================================
// Model API Names (passed to provider functions)
// ============================================================================

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
