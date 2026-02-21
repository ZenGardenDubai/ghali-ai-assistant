import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { CREDITS_PRO } from "./constants";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

/**
 * Helper: generate a token for a user and redeem it to link a clerkUserId.
 * Replaces the old linkClerkUser flow.
 */
async function linkViaToken(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  clerkUserId: string
) {
  const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
    userId,
  });
  await t.mutation(api.billing.redeemUpgradeToken, {
    token,
    clerkUserId,
  });
}

// ============================================================================
// generateUpgradeToken
// ============================================================================

describe("generateUpgradeToken", () => {
  it("creates a pending token with 32-char value", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
      userId,
    });

    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[0-9a-f]{32}$/);

    // Validate it's pending
    const result = await t.query(api.billing.validateUpgradeToken, { token });
    expect(result.valid).toBe(true);
  });

  it("invalidates previous pending tokens for same user", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token: token1 } = await t.mutation(
      internal.billing.generateUpgradeToken,
      { userId }
    );
    const { token: token2 } = await t.mutation(
      internal.billing.generateUpgradeToken,
      { userId }
    );

    // First token should be invalidated
    const result1 = await t.query(api.billing.validateUpgradeToken, {
      token: token1,
    });
    expect(result1.valid).toBe(false);

    // Second token should be valid
    const result2 = await t.query(api.billing.validateUpgradeToken, {
      token: token2,
    });
    expect(result2.valid).toBe(true);
  });
});

// ============================================================================
// validateUpgradeToken
// ============================================================================

describe("validateUpgradeToken", () => {
  it("returns valid for fresh token", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
      userId,
    });

    const result = await t.query(api.billing.validateUpgradeToken, { token });
    expect(result.valid).toBe(true);
  });

  it("returns invalid for expired token", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
      userId,
    });

    // Fast-forward past expiry
    await t.run(async (ctx) => {
      const record = await ctx.db
        .query("upgradeTokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      if (record) {
        await ctx.db.patch(record._id, {
          expiresAt: Date.now() - 1000,
        });
      }
    });

    const result = await t.query(api.billing.validateUpgradeToken, { token });
    expect(result.valid).toBe(false);
  });

  it("returns invalid for used token", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
      userId,
    });

    // Redeem it
    await t.mutation(api.billing.redeemUpgradeToken, {
      token,
      clerkUserId: "user_clerk123",
    });

    // Now it should be invalid
    const result = await t.query(api.billing.validateUpgradeToken, { token });
    expect(result.valid).toBe(false);
  });

  it("returns invalid for nonexistent token", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.billing.validateUpgradeToken, {
      token: "nonexistent_token_abc123456789",
    });
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// redeemUpgradeToken
// ============================================================================

describe("redeemUpgradeToken", () => {
  it("links clerkUserId and marks token used", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
      userId,
    });

    const result = await t.mutation(api.billing.redeemUpgradeToken, {
      token,
      clerkUserId: "user_clerk123",
    });

    expect(result.success).toBe(true);

    // User should have clerkUserId linked
    const user = await t.query(api.users.getUser, { userId });
    expect(user!.clerkUserId).toBe("user_clerk123");

    // Token should be used
    const validation = await t.query(api.billing.validateUpgradeToken, {
      token,
    });
    expect(validation.valid).toBe(false);
  });

  it("rejects expired token", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
      userId,
    });

    // Expire it
    await t.run(async (ctx) => {
      const record = await ctx.db
        .query("upgradeTokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      if (record) {
        await ctx.db.patch(record._id, { expiresAt: Date.now() - 1000 });
      }
    });

    const result = await t.mutation(api.billing.redeemUpgradeToken, {
      token,
      clerkUserId: "user_clerk123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects already-used token from different clerkUserId", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
      userId,
    });

    // Redeem once
    await t.mutation(api.billing.redeemUpgradeToken, {
      token,
      clerkUserId: "user_clerk123",
    });

    // Try again with different clerkUserId
    const result = await t.mutation(api.billing.redeemUpgradeToken, {
      token,
      clerkUserId: "user_clerk456",
    });

    expect(result.success).toBe(false);
  });

  it("returns success idempotently when same clerkUserId re-redeems", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
      userId,
    });

    // Redeem once
    await t.mutation(api.billing.redeemUpgradeToken, {
      token,
      clerkUserId: "user_clerk123",
    });

    // Same user re-redeems (e.g., React strict mode double-call)
    const result = await t.mutation(api.billing.redeemUpgradeToken, {
      token,
      clerkUserId: "user_clerk123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects when clerkUserId is already linked to a different user", async () => {
    const t = convexTest(schema, modules);

    // Create two users
    const userId1 = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501111111",
    });
    const userId2 = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971502222222",
    });

    // Link clerkUserId to user1 via token
    await linkViaToken(t, userId1, "user_clerk_shared");

    // Generate token for user2 and try to redeem with the same clerkUserId
    const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
      userId: userId2,
    });
    const result = await t.mutation(api.billing.redeemUpgradeToken, {
      token,
      clerkUserId: "user_clerk_shared",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already linked");
  });
});

// ============================================================================
// cleanupExpiredTokens
// ============================================================================

describe("cleanupExpiredTokens", () => {
  it("marks stale tokens as expired", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(internal.billing.generateUpgradeToken, {
      userId,
    });

    // Expire the token manually
    await t.run(async (ctx) => {
      const record = await ctx.db
        .query("upgradeTokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      if (record) {
        await ctx.db.patch(record._id, { expiresAt: Date.now() - 1000 });
      }
    });

    const { cleaned } = await t.mutation(
      internal.billing.cleanupExpiredTokens
    );
    expect(cleaned).toBe(1);

    // Token should now be expired (not pending)
    const result = await t.query(api.billing.validateUpgradeToken, { token });
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// Subscription Handlers (using token-based linking)
// ============================================================================

describe("handleSubscriptionActive", () => {
  it("upgrades tier to pro and sets 600 credits", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await linkViaToken(t, userId, "user_clerk123");

    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_clerk123",
    });

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.tier).toBe("pro");
    expect(user!.credits).toBe(CREDITS_PRO);
  });

  it("clears subscriptionCanceling flag on reactivation", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await linkViaToken(t, userId, "user_clerk123");

    // Simulate cancel then reactivate
    await t.mutation(internal.billing.handleSubscriptionCanceled, {
      clerkUserId: "user_clerk123",
    });
    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_clerk123",
    });

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.tier).toBe("pro");
    expect(user!.subscriptionCanceling).toBeUndefined();
  });

  it("no-op when clerkUserId not found", async () => {
    const t = convexTest(schema, modules);

    // Should not throw
    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_nonexistent",
    });
  });
});

describe("handleSubscriptionCanceled", () => {
  it("sets subscriptionCanceling true but keeps tier pro", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await linkViaToken(t, userId, "user_clerk123");

    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_clerk123",
    });

    await t.mutation(internal.billing.handleSubscriptionCanceled, {
      clerkUserId: "user_clerk123",
    });

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.tier).toBe("pro");
    expect(user!.credits).toBe(CREDITS_PRO);
    expect(user!.subscriptionCanceling).toBe(true);
  });

  it("no-op when clerkUserId not found", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.billing.handleSubscriptionCanceled, {
      clerkUserId: "user_nonexistent",
    });
  });
});

describe("handleSubscriptionEnded", () => {
  it("downgrades tier to basic and clears subscriptionCanceling", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(api.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await linkViaToken(t, userId, "user_clerk123");

    // Activate, cancel, then end
    await t.mutation(internal.billing.handleSubscriptionActive, {
      clerkUserId: "user_clerk123",
    });
    await t.mutation(internal.billing.handleSubscriptionCanceled, {
      clerkUserId: "user_clerk123",
    });
    await t.mutation(internal.billing.handleSubscriptionEnded, {
      clerkUserId: "user_clerk123",
    });

    const user = await t.query(api.users.getUser, { userId });
    expect(user!.tier).toBe("basic");
    expect(user!.subscriptionCanceling).toBeUndefined();
    // Credits remain as-is — next monthly reset will give basic amount
    expect(user!.credits).toBe(CREDITS_PRO);
  });

  it("no-op when clerkUserId not found", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.billing.handleSubscriptionEnded, {
      clerkUserId: "user_nonexistent",
    });
  });
});
