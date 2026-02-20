/**
 * Model Constants — Single Source of Truth
 *
 * All model identifiers and cost rates are defined here.
 * Never hardcode model strings anywhere else in the codebase.
 */

// ============================================================================
// Model API Names (passed to provider functions)
// ============================================================================

export const MODELS = {
  /** Primary agent model — fast, cheap, handles ~85% of requests */
  FLASH: "gemini-3-flash-preview",
  /** Deep reasoning escalation — complex math, logic, analysis, coding */
  DEEP_REASONING: "claude-opus-4-6",
  /** Image generation model — ~$0.039/image (1,290 output tokens) */
  IMAGE_GENERATION: "gemini-3-pro-image-preview",
  /** Text embedding model for RAG */
  EMBEDDING: "text-embedding-3-small",
} as const;

// ============================================================================
// Cost Rates (per 1M tokens)
// ============================================================================

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  [MODELS.FLASH]: { input: 0.1, output: 0.4 },
  [MODELS.DEEP_REASONING]: { input: 15.0, output: 75.0 },
  [MODELS.IMAGE_GENERATION]: { input: 1.25, output: 30.0 },
  [MODELS.EMBEDDING]: { input: 0.02, output: 0 },
};
