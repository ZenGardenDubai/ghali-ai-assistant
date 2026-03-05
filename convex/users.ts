import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { detectTimezone } from "./lib/utils";
import { CREDITS_BASIC, CREDITS_PRO, CREDIT_RESET_PERIOD_MS, MEMORY_COMPACTION_THRESHOLD, ERROR_CIRCUIT_BREAKER_THRESHOLD, ERROR_BACKOFF_MS } from "./constants";
import { isFileTooLarge } from "./lib/userFiles";
import { appendToCategory, editMemoryContent, needsCompaction, type MemoryCategory } from "./lib/memory";
import { upsertProfileEntry } from "./lib/profile";

export const findOrCreateUser = internalMutation({
  args: {
    phone: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { phone, name }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    const timezone = detectTimezone(phone);
    const userId = await ctx.db.insert("users", {
      phone,
      name,
      language: "en",
      timezone,
      tier: "basic",
      isAdmin: false,
      credits: CREDITS_BASIC,
      creditsResetAt: now + CREDIT_RESET_PERIOD_MS,
      onboardingStep: 1,
      createdAt: now,
    });

    // Initialize the 4 user files
    const files = ["memory", "personality", "heartbeat", "profile"] as const;
    for (const filename of files) {
      await ctx.db.insert("userFiles", {
        userId,
        filename,
        content: "",
        updatedAt: now,
      });
    }

    // Fire analytics at creation time — not first message — so the user appears
    // in PostHog even if their first message is lost (circuit breaker, crash, etc.)
    await ctx.scheduler.runAfter(0, internal.analytics.trackUserNew, {
      phone,
      timezone,
    });
    await ctx.scheduler.runAfter(0, internal.analytics.identifyUser, {
      phone,
      timezone,
      tier: "basic",
    });

    return userId;
  },
});

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const getUserByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
  },
});

export const updateUser = internalMutation({
  args: {
    userId: v.id("users"),
    fields: v.object({
      name: v.optional(v.string()),
      language: v.optional(v.string()),
      timezone: v.optional(v.string()),
      tier: v.optional(v.union(v.literal("basic"), v.literal("pro"))),
      isAdmin: v.optional(v.boolean()),
      credits: v.optional(v.number()),
      creditsResetAt: v.optional(v.number()),
      onboardingStep: v.optional(v.union(v.number(), v.null())),
      clerkUserId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, fields } = args;
    await ctx.db.patch(userId, fields as Record<string, unknown>);
  },
});

export const getUserFile = internalQuery({
  args: {
    userId: v.id("users"),
    filename: v.union(
      v.literal("memory"),
      v.literal("personality"),
      v.literal("heartbeat"),
      v.literal("profile")
    ),
  },
  handler: async (ctx, { userId, filename }) => {
    return await ctx.db
      .query("userFiles")
      .withIndex("by_userId_filename", (q) =>
        q.eq("userId", userId).eq("filename", filename)
      )
      .unique();
  },
});

export const getUserFiles = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userFiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const updateUserFile = internalMutation({
  args: {
    userId: v.id("users"),
    filename: v.union(
      v.literal("memory"),
      v.literal("personality"),
      v.literal("heartbeat"),
      v.literal("profile")
    ),
    content: v.string(),
  },
  handler: async (ctx, { userId, filename, content }) => {
    const file = await ctx.db
      .query("userFiles")
      .withIndex("by_userId_filename", (q) =>
        q.eq("userId", userId).eq("filename", filename)
      )
      .unique();

    if (!file) {
      throw new Error(`User file not found: ${filename}`);
    }

    await ctx.db.patch(file._id, {
      content,
      updatedAt: Date.now(),
    });
  },
});

// Pending action management for clear data and admin broadcast confirmation flow
export const setPendingAction = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.union(
      v.literal("clear_memory"),
      v.literal("clear_documents"),
      v.literal("clear_schedules"),
      v.literal("clear_everything"),
      v.literal("admin_broadcast")
    ),
    payload: v.optional(v.string()),
  },
  handler: async (ctx, { userId, action, payload }) => {
    await ctx.db.patch(userId, {
      pendingAction: action,
      pendingActionAt: Date.now(),
      pendingPayload: payload,
    });
  },
});

export const clearPendingAction = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, {
      pendingAction: undefined,
      pendingActionAt: undefined,
      pendingPayload: undefined,
    });
  },
});


// Internal mutation for use by actions (e.g., onboarding)
export const internalUpdateUser = internalMutation({
  args: {
    userId: v.id("users"),
    fields: v.object({
      name: v.optional(v.string()),
      language: v.optional(v.string()),
      timezone: v.optional(v.string()),
      onboardingStep: v.optional(v.union(v.number(), v.null())),
    }),
  },
  handler: async (ctx, { userId, fields }) => {
    await ctx.db.patch(userId, fields as Record<string, unknown>);
  },
});

// Internal queries for use by actions
export const internalGetUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const internalGetUserFiles = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userFiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

/** Get account data for a Clerk-authenticated user (used by /account page) */
export const getAccountData = internalQuery({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user) return null;

    const tierCredits = user.tier === "pro" ? CREDITS_PRO : CREDITS_BASIC;
    return {
      name: user.name,
      phone: user.phone,
      tier: user.tier,
      credits: user.credits,
      creditsTotal: tierCredits,
      creditsResetAt: user.creditsResetAt,
      subscriptionCanceling: user.subscriptionCanceling ?? false,
      createdAt: user.createdAt,
    };
  },
});

// Internal version for agent tools (called via ctx.runMutation)
export const internalUpdateUserFile = internalMutation({
  args: {
    userId: v.id("users"),
    filename: v.union(
      v.literal("memory"),
      v.literal("personality"),
      v.literal("heartbeat"),
      v.literal("profile")
    ),
    content: v.string(),
  },
  handler: async (ctx, { userId, filename, content }) => {
    const file = await ctx.db
      .query("userFiles")
      .withIndex("by_userId_filename", (q) =>
        q.eq("userId", userId).eq("filename", filename)
      )
      .unique();

    if (!file) {
      throw new Error(`User file not found: ${filename}`);
    }

    await ctx.db.patch(file._id, {
      content,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// Structured Memory Operations
// ============================================================================

export const internalAppendMemory = internalMutation({
  args: {
    userId: v.id("users"),
    category: v.union(
      v.literal("personal"),
      v.literal("work_education"),
      v.literal("preferences"),
      v.literal("schedule"),
      v.literal("interests"),
      v.literal("general")
    ),
    content: v.string(),
  },
  handler: async (ctx, { userId, category, content }) => {
    const file = await ctx.db
      .query("userFiles")
      .withIndex("by_userId_filename", (q) =>
        q.eq("userId", userId).eq("filename", "memory")
      )
      .unique();

    if (!file) {
      throw new Error("Memory file not found");
    }

    const updated = appendToCategory(
      file.content,
      category as MemoryCategory,
      content
    );

    if (isFileTooLarge(updated)) {
      throw new Error("Memory file would exceed 50KB limit. Use editMemory to remove old content first.");
    }

    await ctx.db.patch(file._id, {
      content: updated,
      updatedAt: Date.now(),
    });

    const compactionScheduled = needsCompaction(updated, MEMORY_COMPACTION_THRESHOLD);
    if (compactionScheduled) {
      await ctx.scheduler.runAfter(0, internal.memoryCompaction.compactMemory, { userId });
    }

    return { compactionScheduled };
  },
});

export const internalEditMemory = internalMutation({
  args: {
    userId: v.id("users"),
    search: v.string(),
    replacement: v.string(),
  },
  handler: async (ctx, { userId, search, replacement }) => {
    const file = await ctx.db
      .query("userFiles")
      .withIndex("by_userId_filename", (q) =>
        q.eq("userId", userId).eq("filename", "memory")
      )
      .unique();

    if (!file) {
      throw new Error("Memory file not found");
    }

    const { updated, found } = editMemoryContent(file.content, search, replacement);

    if (!found) {
      return { found: false };
    }

    if (isFileTooLarge(updated)) {
      throw new Error("Edit would exceed 50KB limit. Use a shorter replacement.");
    }

    await ctx.db.patch(file._id, {
      content: updated,
      updatedAt: Date.now(),
    });

    return { found: true };
  },
});

export const saveMemorySnapshot = internalMutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, { userId, content }) => {
    // Delete existing snapshot (keep only 1 per user)
    const existing = await ctx.db
      .query("memorySnapshots")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const snap of existing) {
      await ctx.db.delete(snap._id);
    }

    await ctx.db.insert("memorySnapshots", {
      userId,
      content,
      createdAt: Date.now(),
    });
  },
});

/** Migration-only query — do NOT use for production features (no pagination). */
export const getAllUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// ============================================================================
// Circuit Breaker — API Error Tracking
// ============================================================================

/**
 * Record a consecutive API error for a user.
 * Increments the error counter and trips the circuit breaker (sets errorBackoffUntil)
 * once the threshold is reached.
 * Returns the new consecutive error count and whether the circuit breaker just tripped.
 */
export const recordApiError = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<{ consecutiveErrors: number; tripped: boolean }> => {
    const user = await ctx.db.get(userId);
    if (!user) return { consecutiveErrors: 0, tripped: false };

    const newCount = (user.consecutiveErrors ?? 0) + 1;
    // Trip (or re-arm) the circuit breaker when we hit the threshold.
    // Don't overwrite errorBackoffUntil while it's still in the future —
    // but if it's missing or expired and we're at/above threshold, set a fresh one.
    const backoffActive = user.errorBackoffUntil && user.errorBackoffUntil > Date.now();
    const tripped =
      newCount >= ERROR_CIRCUIT_BREAKER_THRESHOLD && !backoffActive;
    const updates: Record<string, unknown> = { consecutiveErrors: newCount };
    if (tripped) {
      updates.errorBackoffUntil = Date.now() + ERROR_BACKOFF_MS;
    }
    await ctx.db.patch(userId, updates);
    return { consecutiveErrors: newCount, tripped };
  },
});

/**
 * Reset the consecutive error counter after a successful AI response.
 * Clears both the error count and the backoff timestamp.
 */
export const resetApiErrors = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, {
      consecutiveErrors: 0,
      errorBackoffUntil: undefined,
    });
  },
});

// ============================================================================
// Profile Upsert
// ============================================================================

/**
 * Upsert a fact in the user's profile file.
 * Creates the profile file on first write for existing users.
 */
export const internalUpsertProfile = internalMutation({
  args: {
    userId: v.id("users"),
    category: v.string(),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, { userId, category, key, value }) => {
    let file = await ctx.db
      .query("userFiles")
      .withIndex("by_userId_filename", (q) =>
        q.eq("userId", userId).eq("filename", "profile")
      )
      .unique();

    // Handle existing users who don't have a profile file yet
    if (!file) {
      await ctx.db.insert("userFiles", {
        userId,
        filename: "profile",
        content: "",
        updatedAt: Date.now(),
      });
      // Re-read to self-heal if concurrent inserts created duplicates
      const matches = await ctx.db
        .query("userFiles")
        .withIndex("by_userId_filename", (q) =>
          q.eq("userId", userId).eq("filename", "profile")
        )
        .collect();
      file = matches.sort((a, b) => a._creationTime - b._creationTime)[0]!;
    }

    const updated = upsertProfileEntry(file.content, category, key, value);

    if (isFileTooLarge(updated)) {
      throw new Error("Profile file would exceed 50KB limit.");
    }

    await ctx.db.patch(file._id, {
      content: updated,
      updatedAt: Date.now(),
    });
  },
});
