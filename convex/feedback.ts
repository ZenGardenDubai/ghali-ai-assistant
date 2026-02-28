import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  FEEDBACK_TOKEN_EXPIRY_MS,
  FEEDBACK_MAX_PER_DAY,
  FEEDBACK_MAX_MESSAGE_LENGTH,
} from "./constants";

// ============================================================================
// Token Functions
// ============================================================================

export const generateFeedbackToken = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Generate 32-byte random hex token
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await ctx.db.insert("feedbackTokens", {
      token,
      phone: user.phone,
      expiresAt: Date.now() + FEEDBACK_TOKEN_EXPIRY_MS,
      used: false,
    });

    const siteUrl = process.env.SITE_URL ?? "https://ghali.ae";
    return { token, url: `${siteUrl}/feedback?token=${token}` };
  },
});

export const validateFeedbackToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const doc = await ctx.db
      .query("feedbackTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!doc) {
      return { valid: false as const, reason: "not_found" as const };
    }
    if (doc.used) {
      return { valid: false as const, reason: "used" as const };
    }
    if (doc.expiresAt < Date.now()) {
      return { valid: false as const, reason: "expired" as const };
    }

    // Mask phone for display: +971501234567 → +971****4567
    const phone = doc.phone;
    const masked =
      phone.length > 7
        ? phone.slice(0, 4) + "****" + phone.slice(-4)
        : phone;

    return { valid: true as const, phone: masked };
  },
});

export const cleanupExpiredTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("feedbackTokens")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), Date.now()))
      .collect();

    for (const doc of expired) {
      await ctx.db.delete(doc._id);
    }

    return { deleted: expired.length };
  },
});

// ============================================================================
// Feedback CRUD
// ============================================================================

/** Get midnight today in UTC for rate-limit window */
function getTodayMidnightUtcMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export const submitFeedback = internalMutation({
  args: {
    userId: v.id("users"),
    category: v.union(
      v.literal("bug"),
      v.literal("feature_request"),
      v.literal("general")
    ),
    message: v.string(),
    source: v.union(
      v.literal("whatsapp_link"),
      v.literal("web"),
      v.literal("agent_tool")
    ),
  },
  handler: async (ctx, { userId, category, message, source }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { success: false, error: "user_not_found" };

    // Rate limit check
    const todayMidnight = getTodayMidnightUtcMs();
    const todayFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("createdAt"), todayMidnight))
      .collect();

    if (todayFeedback.length >= FEEDBACK_MAX_PER_DAY) {
      return { success: false, error: "rate_limited" };
    }

    // Truncate message if needed
    const truncatedMessage = message.slice(0, FEEDBACK_MAX_MESSAGE_LENGTH);

    const now = Date.now();
    await ctx.db.insert("feedback", {
      userId,
      phone: user.phone,
      category,
      message: truncatedMessage,
      source,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const submitFeedbackViaToken = internalMutation({
  args: {
    token: v.string(),
    category: v.union(
      v.literal("bug"),
      v.literal("feature_request"),
      v.literal("general")
    ),
    message: v.string(),
  },
  handler: async (ctx, { token, category, message }) => {
    // Validate token atomically
    const tokenDoc = await ctx.db
      .query("feedbackTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!tokenDoc) return { success: false, error: "invalid_token" };
    if (tokenDoc.used) return { success: false, error: "token_used" };
    if (tokenDoc.expiresAt < Date.now())
      return { success: false, error: "token_expired" };

    // Look up user by phone
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", tokenDoc.phone))
      .unique();

    if (!user) return { success: false, error: "user_not_found" };

    // Rate limit check
    const todayMidnight = getTodayMidnightUtcMs();
    const todayFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("createdAt"), todayMidnight))
      .collect();

    if (todayFeedback.length >= FEEDBACK_MAX_PER_DAY) {
      return { success: false, error: "rate_limited" };
    }

    // Mark token as used
    await ctx.db.patch(tokenDoc._id, { used: true });

    // Truncate message if needed
    const truncatedMessage = message.slice(0, FEEDBACK_MAX_MESSAGE_LENGTH);

    const now = Date.now();
    await ctx.db.insert("feedback", {
      userId: user._id,
      phone: user.phone,
      category,
      message: truncatedMessage,
      source: "whatsapp_link",
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

// ============================================================================
// Admin Functions
// ============================================================================

export const listFeedback = internalQuery({
  args: {
    status: v.optional(
      v.union(
        v.literal("new"),
        v.literal("read"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("archived")
      )
    ),
    category: v.optional(
      v.union(
        v.literal("bug"),
        v.literal("feature_request"),
        v.literal("general")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, category, limit }) => {
    const maxResults = Math.min(limit ?? 50, 100);

    let query;
    if (status) {
      query = ctx.db
        .query("feedback")
        .withIndex("by_status", (q) => q.eq("status", status));
    } else {
      query = ctx.db.query("feedback").withIndex("by_createdAt");
    }

    const all = await query.order("desc").collect();

    // Apply category filter in memory (Convex only allows one index per query)
    let filtered = category
      ? all.filter((f) => f.category === category)
      : all;

    filtered = filtered.slice(0, maxResults);

    return filtered;
  },
});

export const getFeedbackById = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, { feedbackId }) => {
    return await ctx.db.get(feedbackId);
  },
});

export const updateFeedbackStatus = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    status: v.union(
      v.literal("new"),
      v.literal("read"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, { feedbackId, status }) => {
    await ctx.db.patch(feedbackId, {
      status,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const updateFeedbackNotes = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    notes: v.string(),
  },
  handler: async (ctx, { feedbackId, notes }) => {
    await ctx.db.patch(feedbackId, {
      adminNotes: notes,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const getFeedbackStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("feedback").collect();

    const stats = {
      new: 0,
      read: 0,
      in_progress: 0,
      resolved: 0,
      archived: 0,
    };

    for (const f of all) {
      stats[f.status]++;
    }

    return stats;
  },
});
