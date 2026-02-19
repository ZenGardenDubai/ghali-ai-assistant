import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Cost per 1M tokens (approximate)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.0-pro": { input: 1.25, output: 10.0 },
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
};

function estimateCost(
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const rates = MODEL_COSTS[model] ?? { input: 0.5, output: 1.5 };
  return (tokensIn * rates.input + tokensOut * rates.output) / 1_000_000;
}

export const trackUsage = internalMutation({
  args: {
    userId: v.string(),
    model: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
  },
  handler: async (ctx, { userId, model, tokensIn, tokensOut }) => {
    await ctx.db.insert("usage", {
      userId: userId as Id<"users">,
      model,
      tokensIn,
      tokensOut,
      cost: estimateCost(model, tokensIn, tokensOut),
      timestamp: Date.now(),
    });
  },
});

export const getUserUsage = query({
  args: {
    userId: v.id("users"),
    since: v.optional(v.number()),
  },
  handler: async (ctx, { userId, since }) => {
    const q = ctx.db
      .query("usage")
      .withIndex("by_userId_timestamp", (q) => {
        const base = q.eq("userId", userId);
        return since ? base.gte("timestamp", since) : base;
      });
    return await q.collect();
  },
});
