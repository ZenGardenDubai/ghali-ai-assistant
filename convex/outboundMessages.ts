import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Store a wamid → templateName mapping for delivery quality tracking.
 * Called after successfully sending a template message.
 */
export const recordTemplateSend = internalMutation({
  args: {
    wamid: v.string(),
    templateName: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, { wamid, templateName, phone }) => {
    await ctx.db.insert("outboundMessages", {
      wamid,
      templateName,
      phone,
      sentAt: Date.now(),
    });
  },
});

/**
 * Look up the template name for a given wamid.
 * Returns the template name or null if not found (e.g. non-template message).
 */
export const getTemplateByWamid = internalQuery({
  args: { wamid: v.string() },
  handler: async (ctx, { wamid }) => {
    const record = await ctx.db
      .query("outboundMessages")
      .withIndex("by_wamid", (q) => q.eq("wamid", wamid))
      .unique();
    return record?.templateName ?? null;
  },
});

/**
 * Delete outbound message records older than 48h.
 * Called by daily cron to prevent unbounded table growth.
 */
export const cleanupOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000; // 48h ago
    const old = await ctx.db
      .query("outboundMessages")
      .withIndex("by_sentAt", (q) => q.lt("sentAt", cutoff))
      .take(500);
    for (const record of old) {
      await ctx.db.delete(record._id);
    }
    if (old.length > 0) {
      console.log(`[outbound-cleanup] Deleted ${old.length} old records`);
    }
  },
});
