import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { CREDITS_PRO, UPGRADE_TOKEN_EXPIRY_MS } from "./constants";

// ============================================================================
// Upgrade Tokens
// ============================================================================

export const generateUpgradeToken = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Invalidate any existing pending tokens for this user
    const existing = await ctx.db
      .query("upgradeTokens")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const tok of existing) {
      if (tok.status === "pending") {
        await ctx.db.patch(tok._id, { status: "expired" });
      }
    }

    // Generate 32-char hex token
    const token = (crypto.randomUUID() + crypto.randomUUID())
      .replace(/-/g, "")
      .slice(0, 32);

    const now = Date.now();
    await ctx.db.insert("upgradeTokens", {
      token,
      userId,
      status: "pending",
      expiresAt: now + UPGRADE_TOKEN_EXPIRY_MS,
      createdAt: now,
    });

    return { token };
  },
});

export const validateUpgradeToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    const record = await ctx.db
      .query("upgradeTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!record) {
      return { valid: false };
    }

    if (record.status === "pending" && record.expiresAt > Date.now()) {
      return { valid: true };
    }

    return { valid: false };
  },
});

export const redeemUpgradeToken = mutation({
  args: {
    token: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, { token, clerkUserId }) => {
    const record = await ctx.db
      .query("upgradeTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!record) {
      return { success: false, error: "Token is invalid or expired" };
    }

    // Idempotent: if token already used, check if user is correctly linked
    if (record.status === "used") {
      const user = await ctx.db.get(record.userId);
      if (user?.clerkUserId === clerkUserId) {
        return { success: true };
      }
      return { success: false, error: "Token is invalid or expired" };
    }

    if (record.status !== "pending" || record.expiresAt <= Date.now()) {
      return { success: false, error: "Token is invalid or expired" };
    }

    // Guard: check if clerkUserId is already linked to another user
    const existingLink = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (existingLink && existingLink._id !== record.userId) {
      return { success: false, error: "This account is already linked to another user" };
    }

    // Link clerkUserId to the Ghali user
    await ctx.db.patch(record.userId, { clerkUserId });

    // Mark token as used
    await ctx.db.patch(record._id, { status: "used" });

    return { success: true };
  },
});

export const cleanupExpiredTokens = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("upgradeTokens")
      .withIndex("by_status_expiresAt", (q) =>
        q.eq("status", "pending").lt("expiresAt", now)
      )
      .take(100);

    for (const tok of expired) {
      await ctx.db.patch(tok._id, { status: "expired" });
    }

    return { cleaned: expired.length };
  },
});

// ============================================================================
// Subscription Handlers
// ============================================================================

export const handleSubscriptionActive = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user) {
      console.log(`No user found for clerkUserId ${clerkUserId}, skipping activation`);
      return;
    }

    await ctx.db.patch(user._id, {
      tier: "pro",
      credits: CREDITS_PRO,
      subscriptionCanceling: undefined,
    });
  },
});

export const handleSubscriptionCanceled = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user) {
      console.log(`No user found for clerkUserId ${clerkUserId}, skipping cancel`);
      return;
    }

    await ctx.db.patch(user._id, { subscriptionCanceling: true });
  },
});

export const handleSubscriptionEnded = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user) {
      console.log(`No user found for clerkUserId ${clerkUserId}, skipping end`);
      return;
    }

    await ctx.db.patch(user._id, {
      tier: "basic",
      subscriptionCanceling: undefined,
    });
  },
});
