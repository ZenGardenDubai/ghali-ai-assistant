import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";
import { normalizeBody } from "./loopDetection";
import {
  OUTBOUND_ECHO_WINDOW_MS,
  LOOP_DETECTION_MAX_RESPONSES,
  LOOP_DETECTION_WINDOW_MS,
} from "./constants";

const modules = import.meta.glob("./**/*.ts");

async function createTestUser(t: ReturnType<typeof convexTest>): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      phone: "+971501234567",
      language: "en",
      timezone: "Asia/Dubai",
      tier: "basic",
      isAdmin: false,
      credits: 60,
      creditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      onboardingStep: null,
      createdAt: Date.now(),
    });
  });
}

// ============================================================================
// normalizeBody (pure function)
// ============================================================================

describe("normalizeBody", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeBody("  hello  ")).toBe("hello");
  });

  it("lowercases text", () => {
    expect(normalizeBody("I'm Back Online!")).toBe("i'm back online!");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeBody("hello   world")).toBe("hello world");
  });

  it("handles newlines and tabs", () => {
    expect(normalizeBody("hello\n\tworld")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(normalizeBody("")).toBe("");
  });

  it("is idempotent", () => {
    const input = "  Hello World  ";
    expect(normalizeBody(normalizeBody(input))).toBe(normalizeBody(input));
  });
});

// ============================================================================
// logOutboundMessage + isEchoMessage
// ============================================================================

describe("isEchoMessage", () => {
  it("returns false when no recent outbound messages exist", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const result = await t.query(internal.loopDetection.isEchoMessage, {
      userId,
      body: "I'm back online",
    });

    expect(result).toBe(false);
  });

  it("returns true when incoming matches a recent outbound message", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    // Log an outbound message
    await t.mutation(internal.loopDetection.logOutboundMessage, {
      userId,
      body: "I'm back online",
    });

    // Same text comes back as inbound
    const result = await t.query(internal.loopDetection.isEchoMessage, {
      userId,
      body: "I'm back online",
    });

    expect(result).toBe(true);
  });

  it("is case-insensitive", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    await t.mutation(internal.loopDetection.logOutboundMessage, {
      userId,
      body: "I'm Back Online",
    });

    const result = await t.query(internal.loopDetection.isEchoMessage, {
      userId,
      body: "i'm back online",
    });

    expect(result).toBe(true);
  });

  it("ignores leading/trailing whitespace differences", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    await t.mutation(internal.loopDetection.logOutboundMessage, {
      userId,
      body: "I'm back online",
    });

    const result = await t.query(internal.loopDetection.isEchoMessage, {
      userId,
      body: "  I'm back online  ",
    });

    expect(result).toBe(true);
  });

  it("returns false for a different message", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    await t.mutation(internal.loopDetection.logOutboundMessage, {
      userId,
      body: "I'm back online",
    });

    const result = await t.query(internal.loopDetection.isEchoMessage, {
      userId,
      body: "What's the weather today?",
    });

    expect(result).toBe(false);
  });

  it("is scoped per user", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createTestUser(t);
    const userId2 = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone: "+971509999999",
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        onboardingStep: null,
        createdAt: Date.now(),
      });
    });

    // Log outbound for user1 only
    await t.mutation(internal.loopDetection.logOutboundMessage, {
      userId: userId1,
      body: "I'm back online",
    });

    // user2 should not see it
    const result = await t.query(internal.loopDetection.isEchoMessage, {
      userId: userId2,
      body: "I'm back online",
    });

    expect(result).toBe(false);
  });

  it("returns false when outbound log entry is outside the echo window", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    // Insert an old log entry directly (outside the 5-minute window)
    await t.run(async (ctx) => {
      await ctx.db.insert("outboundMessageLog", {
        userId,
        body: "i'm back online",
        sentAt: Date.now() - OUTBOUND_ECHO_WINDOW_MS - 1000,
      });
    });

    const result = await t.query(internal.loopDetection.isEchoMessage, {
      userId,
      body: "I'm back online",
    });

    expect(result).toBe(false);
  });
});

// ============================================================================
// countRecentResponses
// ============================================================================

describe("countRecentResponses", () => {
  it("returns 0 when no recent outbound messages", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    const count = await t.query(internal.loopDetection.countRecentResponses, {
      userId,
    });

    expect(count).toBe(0);
  });

  it("counts messages logged within the window", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    for (let i = 0; i < 5; i++) {
      await t.mutation(internal.loopDetection.logOutboundMessage, {
        userId,
        body: `Message ${i}`,
      });
    }

    const count = await t.query(internal.loopDetection.countRecentResponses, {
      userId,
    });

    expect(count).toBe(5);
  });

  it("does not count messages outside the window", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    // Insert an old log entry directly
    await t.run(async (ctx) => {
      await ctx.db.insert("outboundMessageLog", {
        userId,
        body: "old message",
        sentAt: Date.now() - LOOP_DETECTION_WINDOW_MS - 1000,
      });
    });

    const count = await t.query(internal.loopDetection.countRecentResponses, {
      userId,
    });

    expect(count).toBe(0);
  });

  it("is scoped per user", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createTestUser(t);
    const userId2 = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        phone: "+971509999999",
        language: "en",
        timezone: "Asia/Dubai",
        tier: "basic",
        isAdmin: false,
        credits: 60,
        creditsResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        onboardingStep: null,
        createdAt: Date.now(),
      });
    });

    for (let i = 0; i < 5; i++) {
      await t.mutation(internal.loopDetection.logOutboundMessage, {
        userId: userId1,
        body: `Message ${i}`,
      });
    }

    const count1 = await t.query(internal.loopDetection.countRecentResponses, {
      userId: userId1,
    });
    const count2 = await t.query(internal.loopDetection.countRecentResponses, {
      userId: userId2,
    });

    expect(count1).toBe(5);
    expect(count2).toBe(0);
  });
});

// ============================================================================
// LOOP_DETECTION_MAX_RESPONSES constant sanity check
// ============================================================================

describe("loop detection constants", () => {
  it("max responses is set to a sensible threshold", () => {
    // Should catch loops (which fire rapidly) but not normal fast conversations
    expect(LOOP_DETECTION_MAX_RESPONSES).toBeGreaterThan(5);
    expect(LOOP_DETECTION_MAX_RESPONSES).toBeLessThanOrEqual(20);
  });

  it("echo window and loop detection window are equal (shared table)", () => {
    expect(OUTBOUND_ECHO_WINDOW_MS).toBe(LOOP_DETECTION_WINDOW_MS);
  });
});

// ============================================================================
// cleanupExpiredLogs
// ============================================================================

describe("cleanupExpiredLogs", () => {
  it("removes entries older than the loop detection window", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    // Insert one old entry and one fresh entry
    await t.run(async (ctx) => {
      await ctx.db.insert("outboundMessageLog", {
        userId,
        body: "old message",
        sentAt: Date.now() - LOOP_DETECTION_WINDOW_MS - 1000,
      });
      await ctx.db.insert("outboundMessageLog", {
        userId,
        body: "fresh message",
        sentAt: Date.now(),
      });
    });

    await t.mutation(internal.loopDetection.cleanupExpiredLogs, {});

    const remaining = await t.run(async (ctx) => {
      return await ctx.db.query("outboundMessageLog").collect();
    });

    expect(remaining).toHaveLength(1);
    expect(remaining[0].body).toBe("fresh message");
  });

  it("does nothing when there are no expired entries", async () => {
    const t = convexTest(schema, modules);
    const userId = await createTestUser(t);

    await t.mutation(internal.loopDetection.logOutboundMessage, {
      userId,
      body: "recent message",
    });

    await t.mutation(internal.loopDetection.cleanupExpiredLogs, {});

    const remaining = await t.run(async (ctx) => {
      return await ctx.db.query("outboundMessageLog").collect();
    });

    expect(remaining).toHaveLength(1);
  });
});
