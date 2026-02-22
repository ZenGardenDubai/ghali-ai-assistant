import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { WEBHOOK_DEDUP_TTL_MS } from "./constants";

/**
 * Atomically check and mark a MessageSid as processed (replay protection).
 * Returns true if newly marked (first time seen), false if already processed.
 */
export const tryMarkProcessed = internalMutation({
  args: { messageSid: v.string() },
  handler: async (ctx, { messageSid }) => {
    const existing = await ctx.db
      .query("processedWebhooks")
      .withIndex("by_messageSid", (q) => q.eq("messageSid", messageSid))
      .unique();
    if (existing) return false;
    await ctx.db.insert("processedWebhooks", {
      messageSid,
      processedAt: Date.now(),
    });
    return true;
  },
});

/**
 * Clean up expired dedup entries (called by cron).
 */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - WEBHOOK_DEDUP_TTL_MS;
    const expired = await ctx.db
      .query("processedWebhooks")
      .withIndex("by_processedAt", (q) => q.lt("processedAt", cutoff))
      .collect();

    for (const entry of expired) {
      await ctx.db.delete(entry._id);
    }

    if (expired.length > 0) {
      console.log(`[webhookDedup] Cleaned up ${expired.length} expired entries`);
    }
  },
});
