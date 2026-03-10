import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { OUTBOUND_MESSAGE_RETENTION_MS } from "./constants";

/** Store an outbound message wamid for reply-to-text context lookup. */
export const saveOutbound = internalMutation({
  args: {
    userId: v.id("users"),
    wamid: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { userId, wamid, body }) => {
    await ctx.db.insert("outboundMessages", {
      userId,
      wamid,
      body,
      expiresAt: Date.now() + OUTBOUND_MESSAGE_RETENTION_MS,
    });
  },
});

/** Look up an outbound message by its WhatsApp message ID (wamid). */
export const getByWamid = internalQuery({
  args: { wamid: v.string() },
  handler: async (ctx, { wamid }) => {
    return await ctx.db
      .query("outboundMessages")
      .withIndex("by_wamid", (q) => q.eq("wamid", wamid))
      .first();
  },
});

/** Delete all outbound messages for a user (used by account deletion / clear everything). */
export const deleteUserOutboundMessages = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const records = await ctx.db
      .query("outboundMessages")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const record of records) {
      await ctx.db.delete(record._id);
    }
  },
});

/** Delete expired outbound message records (called by daily cron). */
export const cleanupExpired = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("outboundMessages")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .collect();

    for (const record of expired) {
      await ctx.db.delete(record._id);
    }

    if (expired.length > 0) {
      console.log(`[cleanupExpired] Deleted ${expired.length} outbound message records`);
    }
  },
});
