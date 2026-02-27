"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { PostHog } from "posthog-node";
import { detectCountryFromPhone } from "./lib/analytics";

// ---------------------------------------------------------------------------
// PostHog client (lazy singleton, immediate flush)
// ---------------------------------------------------------------------------

let cachedClient: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) {
    console.warn("[PostHog] Missing POSTHOG_API_KEY — analytics disabled");
    return null;
  }

  cachedClient = new PostHog(apiKey, {
    host: "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return cachedClient;
}

async function captureEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    const posthog = getPostHogClient();
    if (!posthog) return;
    posthog.capture({ distinctId, event, properties });
    await posthog.flush();
  } catch (error) {
    console.error("[PostHog] Failed to capture event:", error);
  }
}

// ---------------------------------------------------------------------------
// Internal Actions — fire-and-forget via ctx.scheduler.runAfter(0, ...)
// ---------------------------------------------------------------------------

export const trackUserNew = internalAction({
  args: {
    phone: v.string(),
    timezone: v.string(),
  },
  handler: async (_ctx, { phone, timezone }) => {
    await captureEvent(phone, "user_new", {
      phone_country: detectCountryFromPhone(phone),
      timezone,
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
  },
  handler: async (_ctx, args) => {
    await captureEvent(args.phone, "$ai_generation", {
      $ai_model: args.model,
      $ai_provider: args.provider,
      $ai_input_tokens: args.promptTokens,
      $ai_output_tokens: args.completionTokens,
      $ai_reasoning_tokens: args.reasoningTokens,
      cached_input_tokens: args.cachedInputTokens,
      phone_country: detectCountryFromPhone(args.phone),
      tier: args.tier,
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
  },
  handler: async (_ctx, { phone, success, latency_ms, model, tier }) => {
    const country = detectCountryFromPhone(phone);

    // Business event
    await captureEvent(phone, "image_generated", {
      success,
      latency_ms,
      phone_country: country,
    });

    // LLM Analytics event (shows in PostHog LLM Analytics dashboard)
    await captureEvent(phone, "$ai_generation", {
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

export const trackFeatureUsed = internalAction({
  args: {
    phone: v.string(),
    feature: v.string(), // "prowrite" | "image_generation" | "deep_reasoning" | "document_processing" | "document_conversion" | "items" | "voice_note" | "web_search"
    tier: v.string(),
    properties: v.optional(v.any()),
  },
  handler: async (_ctx, { phone, feature, tier, properties }) => {
    await captureEvent(phone, "feature_used", {
      feature,
      tier,
      phone_country: detectCountryFromPhone(phone),
      ...(properties as Record<string, unknown> | undefined),
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
