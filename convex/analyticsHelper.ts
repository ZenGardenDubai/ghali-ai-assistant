import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Schedule an AI generation analytics event (fire-and-forget).
 * Used by the agent's usageHandler which only has access to
 * runQuery/runMutation/runAction — not scheduler.
 */
export const scheduleTrackAIGeneration = internalMutation({
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
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.analytics.trackAIGeneration, args);
  },
});
