import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { fillTemplate } from "./lib/utils";
import { TEMPLATES } from "./templates";
import {
  RATE_LIMIT_MESSAGES_PER_MINUTE,
  RATE_LIMIT_BURST_CAPACITY,
} from "./constants";

const modules = import.meta.glob("./**/*.ts");

function createTestWithRateLimiter() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

describe("rate limit constants", () => {
  it("burst capacity is greater than steady-state rate", () => {
    expect(RATE_LIMIT_BURST_CAPACITY).toBeGreaterThan(
      RATE_LIMIT_MESSAGES_PER_MINUTE
    );
  });
});

describe("rate_limited template", () => {
  it("renders correctly with retryAfterSeconds", () => {
    const result = fillTemplate(TEMPLATES.rate_limited.template, {
      retryAfterSeconds: 5,
    });
    expect(result).toBe(
      "You're sending messages too fast. Please wait 5 seconds and try again."
    );
  });

  it("renders with different values", () => {
    const result = fillTemplate(TEMPLATES.rate_limited.template, {
      retryAfterSeconds: 30,
    });
    expect(result).toContain("30 seconds");
  });
});

describe("checkMessageRateLimit", () => {
  it("returns ok: true for normal usage", async () => {
    const t = createTestWithRateLimiter();

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.mutation(
      internal.rateLimiting.checkMessageRateLimit,
      { userId }
    );

    expect(result).toEqual({ ok: true });
  });

  it("returns ok: true for multiple messages within limit", async () => {
    const t = createTestWithRateLimiter();

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Send several messages — should all pass within burst capacity
    for (let i = 0; i < 10; i++) {
      const result = await t.mutation(
        internal.rateLimiting.checkMessageRateLimit,
        { userId }
      );
      expect(result.ok).toBe(true);
    }
  });

  it("returns ok: false with retryAfterSeconds when limit exceeded", async () => {
    const t = createTestWithRateLimiter();

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Exhaust all tokens (burst capacity = 40)
    for (let i = 0; i < RATE_LIMIT_BURST_CAPACITY; i++) {
      await t.mutation(internal.rateLimiting.checkMessageRateLimit, {
        userId,
      });
    }

    // Next call should be rate limited
    const result = await t.mutation(
      internal.rateLimiting.checkMessageRateLimit,
      { userId }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(typeof result.retryAfterSeconds).toBe("number");
    }
  });

  it("rate limits are per-user", async () => {
    const t = createTestWithRateLimiter();

    const userId1 = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });
    const userId2 = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971509876543",
    });

    // Exhaust user1's tokens
    for (let i = 0; i < RATE_LIMIT_BURST_CAPACITY; i++) {
      await t.mutation(internal.rateLimiting.checkMessageRateLimit, {
        userId: userId1,
      });
    }

    // User1 should be rate limited
    const result1 = await t.mutation(
      internal.rateLimiting.checkMessageRateLimit,
      { userId: userId1 }
    );
    expect(result1.ok).toBe(false);

    // User2 should still be fine
    const result2 = await t.mutation(
      internal.rateLimiting.checkMessageRateLimit,
      { userId: userId2 }
    );
    expect(result2.ok).toBe(true);
  });
});
