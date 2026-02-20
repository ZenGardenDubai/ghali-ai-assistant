import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    phone: v.string(),
    name: v.optional(v.string()),
    language: v.string(),
    timezone: v.string(),
    tier: v.union(v.literal("basic"), v.literal("pro")),
    isAdmin: v.boolean(),
    credits: v.number(),
    creditsResetAt: v.number(),
    onboardingStep: v.union(v.number(), v.null()),
    clerkUserId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_clerkUserId", ["clerkUserId"]),

  userFiles: defineTable({
    userId: v.id("users"),
    filename: v.union(
      v.literal("memory"),
      v.literal("personality"),
      v.literal("heartbeat")
    ),
    content: v.string(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_filename", ["userId", "filename"]),

  usage: defineTable({
    userId: v.id("users"),
    model: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    cost: v.number(),
    timestamp: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_timestamp", ["userId", "timestamp"]),

  generatedImages: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    expiresAt: v.number(),
  })
    .index("by_expiresAt", ["expiresAt"])
    .index("by_userId", ["userId"]),

  scheduledJobs: defineTable({
    userId: v.id("users"),
    kind: v.union(
      v.literal("heartbeat"),
      v.literal("reminder"),
      v.literal("followup")
    ),
    payload: v.string(),
    runAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("done"),
      v.literal("cancelled")
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_runAt", ["runAt"])
    .index("by_status_runAt", ["status", "runAt"]),
});
