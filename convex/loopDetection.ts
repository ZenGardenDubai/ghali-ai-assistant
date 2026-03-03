import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  OUTBOUND_ECHO_WINDOW_MS,
  LOOP_DETECTION_MAX_RESPONSES,
  LOOP_DETECTION_WINDOW_MS,
} from "./constants";

/**
 * Normalize a message body for echo comparison.
 * Case-insensitive, trimmed, with whitespace collapsed.
 */
export function normalizeBody(body: string): string {
  return body.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Log an outbound message for echo/loop detection.
 * Called after the agent sends any AI-generated response.
 */
export const logOutboundMessage = internalMutation({
  args: {
    userId: v.id("users"),
    body: v.string(),
  },
  handler: async (ctx, { userId, body }) => {
    await ctx.db.insert("outboundMessageLog", {
      userId,
      body: normalizeBody(body),
      sentAt: Date.now(),
    });
  },
});

/**
 * Check if an incoming message matches a recently sent outbound message.
 * Returns true if the message appears to be an echo of our own output.
 */
export const isEchoMessage = internalQuery({
  args: {
    userId: v.id("users"),
    body: v.string(),
  },
  handler: async (ctx, { userId, body }) => {
    const since = Date.now() - OUTBOUND_ECHO_WINDOW_MS;
    const normalizedIncoming = normalizeBody(body);

    const recentOutbound = await ctx.db
      .query("outboundMessageLog")
      .withIndex("by_userId_sentAt", (q) =>
        q.eq("userId", userId).gte("sentAt", since)
      )
      .collect();

    return recentOutbound.some((entry) => entry.body === normalizedIncoming);
  },
});

/**
 * Count how many AI responses the agent has sent to a user in the loop detection window.
 * Used to enforce a per-user response rate cap as a safety net.
 */
export const countRecentResponses = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const since = Date.now() - LOOP_DETECTION_WINDOW_MS;

    const recentOutbound = await ctx.db
      .query("outboundMessageLog")
      .withIndex("by_userId_sentAt", (q) =>
        q.eq("userId", userId).gte("sentAt", since)
      )
      .collect();

    return recentOutbound.length;
  },
});

/**
 * Clean up expired outbound message log entries (called by cron).
 */
export const cleanupExpiredLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - LOOP_DETECTION_WINDOW_MS;
    const expired = await ctx.db
      .query("outboundMessageLog")
      .withIndex("by_sentAt", (q) => q.lt("sentAt", cutoff))
      .collect();

    for (const entry of expired) {
      await ctx.db.delete(entry._id);
    }

    if (expired.length > 0) {
      console.log(`[loopDetection] Cleaned up ${expired.length} expired entries`);
    }
  },
});
