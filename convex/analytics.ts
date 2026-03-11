"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { detectCountryFromPhone } from "./lib/analytics";

// ---------------------------------------------------------------------------
// PostHog capture — direct HTTP POST for reliable delivery in serverless
// ---------------------------------------------------------------------------

const POSTHOG_HOST = "https://us.i.posthog.com";
const POSTHOG_TIMEOUT_MS = 10_000;

function redactId(id: string): string {
  if (id.length <= 4) return "***";
  return `${id.slice(0, 2)}***${id.slice(-2)}`;
}

function requireApiKey(): string {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) {
    throw new Error("[PostHog] Missing POSTHOG_API_KEY");
  }
  return apiKey;
}

async function postToPostHog(body: Record<string, unknown>, label: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POSTHOG_TIMEOUT_MS);
  try {
    const res = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const msg = `[PostHog] HTTP ${res.status} for ${label}: ${text}`;
      console.error(msg);
      throw new Error(msg);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

async function captureEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
  timestamp?: string
): Promise<void> {
  const apiKey = requireApiKey();
  const payload: Record<string, unknown> = {
    api_key: apiKey,
    event,
    distinct_id: distinctId,
    properties: { ...properties, $lib: "ghali-server" },
  };
  if (timestamp) payload.timestamp = timestamp;
  await postToPostHog(payload, `"${event}" (${redactId(distinctId)})`);
}

async function identifyPerson(
  distinctId: string,
  properties: Record<string, unknown>
): Promise<void> {
  const apiKey = requireApiKey();
  await postToPostHog({
    api_key: apiKey,
    event: "$identify",
    distinct_id: distinctId,
    properties: { $set: properties, $lib: "ghali-server" },
  }, `$identify (${redactId(distinctId)})`);
}

// ---------------------------------------------------------------------------
// Internal Actions — fire-and-forget via ctx.scheduler.runAfter(0, ...)
// ---------------------------------------------------------------------------

export const trackUserNew = internalAction({
  args: {
    phone: v.string(),
    timezone: v.string(),
    timestamp: v.optional(v.string()),
  },
  handler: async (_ctx, { phone, timezone, timestamp }) => {
    await captureEvent(phone, "user_new", {
      phone_country: detectCountryFromPhone(phone),
      timezone,
    }, timestamp);
  },
});

/**
 * PostHog $identify — creates/updates the user profile from day 1.
 * Fired at account creation so the user appears in PostHog even if they
 * never complete onboarding or never send a second message.
 */
export const identifyUser = internalAction({
  args: {
    phone: v.string(),
    timezone: v.string(),
    tier: v.string(),
  },
  handler: async (_ctx, { phone, timezone, tier }) => {
    await identifyPerson(phone, {
      phone,
      country: detectCountryFromPhone(phone),
      tier,
      timezone,
    });
  },
});

/**
 * Fired for every AI-processed message (after successful generation + credit deduction).
 * Provides message-volume tracking separate from session tracking.
 */
export const trackMessageSent = internalAction({
  args: {
    phone: v.string(),
    tier: v.string(),
    is_new_session: v.boolean(),
  },
  handler: async (_ctx, { phone, tier, is_new_session }) => {
    await captureEvent(phone, "message_sent", {
      tier,
      is_new_session,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackUserReturning = internalAction({
  args: {
    phone: v.string(),
    tier: v.string(),
    credits_remaining: v.number(),
  },
  handler: async (_ctx, { phone, tier, credits_remaining }) => {
    await captureEvent(phone, "user_returning", {
      phone_country: detectCountryFromPhone(phone),
      tier,
      credits_remaining,
    });
  },
});

export const trackAIGeneration = internalAction({
  args: {
    phone: v.string(),
    model: v.string(),
    provider: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    reasoningTokens: v.optional(v.number()),
    cachedInputTokens: v.optional(v.number()),
    tier: v.string(),
    traceId: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    await captureEvent(args.phone, "$ai_generation", {
      $ai_trace_id: args.traceId,
      $ai_model: args.model,
      $ai_provider: args.provider,
      $ai_input_tokens: args.promptTokens,
      $ai_output_tokens: args.completionTokens,
      $ai_reasoning_tokens: args.reasoningTokens,
      cached_input_tokens: args.cachedInputTokens,
      phone_country: detectCountryFromPhone(args.phone),
      tier: args.tier,
      source: args.source,
    });
  },
});

export const trackReflectionRan = internalAction({
  args: {
    phone: v.string(),
    tier: v.string(),
    messages_reviewed: v.number(),
    tools_called: v.array(v.string()),
    tools_called_count: v.number(),
    trigger: v.string(),
    threshold: v.number(),
    duration_ms: v.number(),
  },
  handler: async (_ctx, args) => {
    await captureEvent(args.phone, "reflection_agent_ran", {
      tier: args.tier,
      messages_reviewed: args.messages_reviewed,
      tools_called: args.tools_called,
      tools_called_count: args.tools_called_count,
      trigger: args.trigger,
      threshold: args.threshold,
      duration_ms: args.duration_ms,
      phone_country: detectCountryFromPhone(args.phone),
    });
  },
});

export const trackReflectionSkipped = internalAction({
  args: {
    phone: v.string(),
    reason: v.string(),
  },
  handler: async (_ctx, { phone, reason }) => {
    await captureEvent(phone, "reflection_agent_skipped", {
      reason,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackCreditUsed = internalAction({
  args: {
    phone: v.string(),
    credits_remaining: v.number(),
    tier: v.string(),
    model: v.optional(v.string()),
    tools_used: v.optional(v.array(v.string())),
  },
  handler: async (_ctx, { phone, credits_remaining, tier, model, tools_used }) => {
    await captureEvent(phone, "credit_used", {
      credits_remaining,
      tier,
      model,
      tools_used,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackCreditsExhausted = internalAction({
  args: {
    phone: v.string(),
    tier: v.string(),
    reset_at: v.number(),
  },
  handler: async (_ctx, { phone, tier, reset_at }) => {
    await captureEvent(phone, "credits_exhausted", {
      tier,
      reset_at,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackSystemCommand = internalAction({
  args: {
    phone: v.string(),
    command: v.string(),
  },
  handler: async (_ctx, { phone, command }) => {
    await captureEvent(phone, "system_command", {
      command,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackImageGenerated = internalAction({
  args: {
    phone: v.string(),
    success: v.boolean(),
    latency_ms: v.optional(v.number()),
    model: v.optional(v.string()),
    tier: v.optional(v.string()),
    traceId: v.optional(v.string()),
  },
  handler: async (_ctx, { phone, success, latency_ms, model, tier, traceId }) => {
    const country = detectCountryFromPhone(phone);

    // Business event
    await captureEvent(phone, "image_generated", {
      success,
      latency_ms,
      phone_country: country,
    });

    // LLM Analytics event (shows in PostHog LLM Analytics dashboard)
    await captureEvent(phone, "$ai_generation", {
      $ai_trace_id: traceId,
      $ai_model: model ?? "gemini-3-pro-image-preview",
      $ai_provider: "google",
      $ai_latency: latency_ms ? latency_ms / 1000 : undefined,
      $ai_is_error: !success,
      $ai_input_tokens: 0,
      $ai_output_tokens: success ? 1290 : 0,
      generation_type: "image",
      phone_country: country,
      tier,
    });
  },
});

export const trackFileConverted = internalAction({
  args: {
    phone: v.string(),
    input_format: v.string(),
    output_format: v.string(),
    success: v.boolean(),
    latency_ms: v.optional(v.number()),
  },
  handler: async (_ctx, { phone, input_format, output_format, success, latency_ms }) => {
    await captureEvent(phone, "file_converted", {
      input_format,
      output_format,
      success,
      latency_ms,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

const ALLOWED_FEATURES = new Set([
  "prowrite",
  "image_generation",
  "deep_reasoning",
  "document_processing",
  "document_conversion",
  "items",
  "voice_note",
  "web_search",
  "feedback",
  "scheduled_tasks",
]);

export const trackFeatureUsed = internalAction({
  args: {
    phone: v.string(),
    feature: v.string(), // "prowrite" | "image_generation" | "deep_reasoning" | "document_processing" | "document_conversion" | "items" | "voice_note" | "web_search" | "feedback" | "scheduled_tasks"
    tier: v.string(),
    properties: v.optional(v.any()),
  },
  handler: async (_ctx, { phone, feature, tier, properties }) => {
    if (!ALLOWED_FEATURES.has(feature)) {
      console.warn(`[PostHog] Ignoring unknown feature_used value: ${feature}`);
      return;
    }
    await captureEvent(phone, "feature_used", {
      // Spread extra properties first so reserved keys cannot be overridden
      ...(properties as Record<string, unknown> | undefined),
      feature,
      tier,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackFeedbackSubmitted = internalAction({
  args: {
    phone: v.string(),
    category: v.string(),
    source: v.string(),
    tier: v.string(),
  },
  handler: async (_ctx, { phone, category, source, tier }) => {
    await captureEvent(phone, "feedback_submitted", {
      category,
      source,
      tier,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackDocumentProcessed = internalAction({
  args: {
    phone: v.string(),
    media_type: v.string(),
    has_rag: v.boolean(),
  },
  handler: async (_ctx, { phone, media_type, has_rag }) => {
    await captureEvent(phone, "document_processed", {
      media_type,
      has_rag,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

// ---------------------------------------------------------------------------
// Scheduled Tasks Analytics
// ---------------------------------------------------------------------------

export const trackScheduledTaskCreated = internalAction({
  args: {
    phone: v.string(),
    schedule_kind: v.string(),
    tier: v.string(),
  },
  handler: async (_ctx, { phone, schedule_kind, tier }) => {
    await captureEvent(phone, "scheduled_task_created", {
      schedule_kind,
      tier,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackScheduledTaskExecuted = internalAction({
  args: {
    phone: v.string(),
    schedule_kind: v.string(),
    tier: v.string(),
    duration_ms: v.number(),
  },
  handler: async (_ctx, { phone, schedule_kind, tier, duration_ms }) => {
    await captureEvent(phone, "scheduled_task_executed", {
      schedule_kind,
      tier,
      duration_ms,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackScheduledTaskSkipped = internalAction({
  args: {
    phone: v.string(),
    reason: v.string(),
    tier: v.string(),
  },
  handler: async (_ctx, { phone, reason, tier }) => {
    await captureEvent(phone, "scheduled_task_skipped", {
      reason,
      tier,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackScheduledTaskUpdated = internalAction({
  args: {
    phone: v.string(),
    action: v.string(),
    tier: v.string(),
  },
  handler: async (_ctx, { phone, action, tier }) => {
    await captureEvent(phone, "scheduled_task_updated", {
      action,
      tier,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackScheduledTaskCreditNotification = internalAction({
  args: {
    phone: v.string(),
    tier: v.string(),
  },
  handler: async (_ctx, { phone, tier }) => {
    await captureEvent(phone, "scheduled_task_credit_notification", {
      tier,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

// ============================================================================
// Account Control Events
// ============================================================================

export const trackUserOptedOut = internalAction({
  args: {
    phone: v.string(),
    tier: v.string(),
  },
  handler: async (_ctx, { phone, tier }) => {
    await captureEvent(phone, "user_opted_out", {
      tier,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackUserOptedIn = internalAction({
  args: {
    phone: v.string(),
    tier: v.string(),
  },
  handler: async (_ctx, { phone, tier }) => {
    await captureEvent(phone, "user_opted_in", {
      tier,
      phone_country: detectCountryFromPhone(phone),
    });
  },
});

export const trackAccountDeleted = internalAction({
  args: {
    phoneHash: v.string(),
  },
  handler: async (_ctx, { phoneHash }) => {
    await captureEvent(phoneHash, "account_deleted", {
      phone_hash: phoneHash,
    });
  },
});
