import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { detectTimezone } from "./lib/utils";

export const findOrCreateUser = mutation({
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
    const userId = await ctx.db.insert("users", {
      phone,
      name,
      language: "en",
      timezone: detectTimezone(phone),
      tier: "basic",
      isAdmin: false,
      credits: 60,
      creditsResetAt: now + 30 * 24 * 60 * 60 * 1000,
      onboardingStep: 1,
      createdAt: now,
    });

    // Initialize the 3 user files
    const files = ["memory", "personality", "heartbeat"] as const;
    for (const filename of files) {
      await ctx.db.insert("userFiles", {
        userId,
        filename,
        content: "",
        updatedAt: now,
      });
    }

    return userId;
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const getUserByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
  },
});

export const updateUser = mutation({
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

export const getUserFile = query({
  args: {
    userId: v.id("users"),
    filename: v.union(
      v.literal("memory"),
      v.literal("personality"),
      v.literal("heartbeat")
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

export const getUserFiles = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userFiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const updateUserFile = mutation({
  args: {
    userId: v.id("users"),
    filename: v.union(
      v.literal("memory"),
      v.literal("personality"),
      v.literal("heartbeat")
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

// Internal version for agent tools (called via ctx.runMutation)
export const internalUpdateUserFile = internalMutation({
  args: {
    userId: v.id("users"),
    filename: v.union(
      v.literal("memory"),
      v.literal("personality"),
      v.literal("heartbeat")
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
