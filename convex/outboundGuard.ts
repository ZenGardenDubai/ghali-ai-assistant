import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  OUTBOUND_MIN_INTERVAL_MS,
  OUTBOUND_MAX_PER_MINUTE,
  MAX_PROACTIVE_PER_DAY,
  MAX_TEMPLATES_PER_DAY,
} from "./constants";
import { getDubaiMidnightMs } from "./lib/dateUtils";

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

    // Blocked users should never receive messages
    if (user.blocked) {
      return { allowed: false, reason: "user_blocked" };
    }

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

/** One day in milliseconds */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Get the next Dubai midnight (UTC+4) as a Unix timestamp.
 * Used for calendar-day resets aligned with Meta's daily template caps.
 */
function getNextDubaiMidnightMs(now: number): number {
  const todayMidnight = getDubaiMidnightMs(now);
  return todayMidnight + ONE_DAY_MS;
}

/**
 * Check if a daily counter window has expired and return the current count.
 * Returns { count, expired, nextResetAt } — caller uses nextResetAt for calendar-day alignment.
 */
function checkDailyWindow(
  currentCount: number | undefined,
  resetAt: number | undefined,
  now: number
): { count: number; expired: boolean; nextResetAt: number } {
  const count = currentCount ?? 0;
  const expired = !resetAt || now >= resetAt;
  return { count: expired ? 0 : count, expired, nextResetAt: getNextDubaiMidnightMs(now) };
}

/**
 * Daily proactive outbound guard — prevents flooding users with system-initiated messages.
 * Applies to: heartbeat, reminders, scheduled tasks, broadcasts.
 * Does NOT apply to: responses to user messages (those are reactive).
 *
 * Returns { allowed: true } and increments the daily count, or { allowed: false, reason }.
 */
export const checkAndRecordProactiveSend = internalMutation({
  args: { userId: v.id("users") },
  handler: async (
    ctx,
    { userId }
  ): Promise<{ allowed: true } | { allowed: false; reason: string }> => {
    const user = await ctx.db.get(userId);
    if (!user) return { allowed: false, reason: "user_not_found" };

    if (user.blocked) {
      return { allowed: false, reason: "user_blocked" };
    }

    const now = Date.now();
    const { count, expired, nextResetAt } = checkDailyWindow(
      user.dailyProactiveSentCount,
      user.dailyProactiveResetAt,
      now
    );

    if (count >= MAX_PROACTIVE_PER_DAY) {
      return {
        allowed: false,
        reason: `daily_proactive_limit: ${count}/${MAX_PROACTIVE_PER_DAY} proactive messages today`,
      };
    }

    await ctx.db.patch(userId, {
      dailyProactiveSentCount: count + 1,
      ...(expired ? { dailyProactiveResetAt: nextResetAt } : {}),
    });

    return { allowed: true };
  },
});

/**
 * Daily template send guard — prevents exceeding Meta's per-user template cap.
 * Meta limits users to ~2 marketing templates/day across ALL brands.
 * We cap at MAX_TEMPLATES_PER_DAY to avoid our templates being silently dropped.
 *
 * Returns { allowed: true } and increments the daily count, or { allowed: false, reason }.
 */
export const checkAndRecordTemplateSend = internalMutation({
  args: { userId: v.id("users") },
  handler: async (
    ctx,
    { userId }
  ): Promise<{ allowed: true } | { allowed: false; reason: string }> => {
    const user = await ctx.db.get(userId);
    if (!user) return { allowed: false, reason: "user_not_found" };

    if (user.blocked) {
      return { allowed: false, reason: "user_blocked" };
    }

    const now = Date.now();
    const { count, expired, nextResetAt } = checkDailyWindow(
      user.dailyTemplateSentCount,
      user.dailyTemplateResetAt,
      now
    );

    if (count >= MAX_TEMPLATES_PER_DAY) {
      return {
        allowed: false,
        reason: `daily_template_limit: ${count}/${MAX_TEMPLATES_PER_DAY} templates today`,
      };
    }

    await ctx.db.patch(userId, {
      dailyTemplateSentCount: count + 1,
      ...(expired ? { dailyTemplateResetAt: nextResetAt } : {}),
    });

    return { allowed: true };
  },
});
