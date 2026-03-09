import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { OUTBOUND_MIN_INTERVAL_MS, OUTBOUND_MAX_PER_MINUTE } from "./constants";

/**
 * Outbound rate guard — prevents sending too many messages to the same user.
 *
 * Two checks:
 * 1. Minimum interval between messages (e.g. 2s)
 * 2. Maximum messages per minute
 *
 * Returns { allowed: true } and records the send, or { allowed: false, reason: string }.
 */
export const checkAndRecordOutbound = internalMutation({
  args: { userId: v.id("users") },
  handler: async (
    ctx,
    { userId }
  ): Promise<{ allowed: true } | { allowed: false; reason: string }> => {
    const user = await ctx.db.get(userId);
    if (!user) return { allowed: false, reason: "user_not_found" };

    const now = Date.now();

    // Check 1: Minimum interval since last outbound
    if (
      user.lastOutboundAt &&
      now - user.lastOutboundAt < OUTBOUND_MIN_INTERVAL_MS
    ) {
      return {
        allowed: false,
        reason: `outbound_too_fast: ${now - user.lastOutboundAt}ms since last send`,
      };
    }

    // Check 2: Max messages per minute
    const windowStart = user.outboundWindowStart ?? 0;
    const countInWindow = user.outboundCountInWindow ?? 0;
    const windowExpired = now - windowStart > 60_000;

    if (!windowExpired && countInWindow >= OUTBOUND_MAX_PER_MINUTE) {
      return {
        allowed: false,
        reason: `outbound_rate_exceeded: ${countInWindow} messages in current minute window`,
      };
    }

    // Record this send
    await ctx.db.patch(userId, {
      lastOutboundAt: now,
      outboundCountInWindow: windowExpired ? 1 : countInWindow + 1,
      outboundWindowStart: windowExpired ? now : windowStart,
    });

    return { allowed: true };
  },
});
