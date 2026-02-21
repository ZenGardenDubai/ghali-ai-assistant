import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import {
  RATE_LIMIT_MESSAGES_PER_MINUTE,
  RATE_LIMIT_BURST_CAPACITY,
} from "./constants";

const rateLimiter = new RateLimiter(components.rateLimiter, {
  messagePerUser: {
    kind: "token bucket",
    rate: RATE_LIMIT_MESSAGES_PER_MINUTE,
    period: MINUTE,
    capacity: RATE_LIMIT_BURST_CAPACITY,
  },
});

/**
 * Check and consume a rate limit token for a user's message.
 * Returns { ok: true } or { ok: false, retryAfterSeconds: number }.
 */
export const checkMessageRateLimit = internalMutation({
  args: { userId: v.id("users") },
  handler: async (
    ctx,
    { userId }
  ): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> => {
    const result = await rateLimiter.limit(ctx, "messagePerUser", {
      key: userId,
    });

    if (result.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      retryAfterSeconds: Math.ceil(result.retryAfter / 1000),
    };
  },
});
