import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    phone: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    language: v.string(),
    timezone: v.string(),
    tier: v.union(v.literal("basic"), v.literal("pro")),
    isAdmin: v.boolean(),
    credits: v.number(),
    creditsResetAt: v.number(),
    onboardingStep: v.union(v.number(), v.null()),
    clerkUserId: v.optional(v.string()),
    subscriptionCanceling: v.optional(v.boolean()),
    pendingAction: v.optional(v.union(
      v.literal("clear_memory"),
      v.literal("clear_documents"),
      v.literal("clear_everything"),
      v.literal("admin_broadcast")
    )),
    pendingActionAt: v.optional(v.number()),
    pendingPayload: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_tier", ["tier"]),

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

  memorySnapshots: defineTable({
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  generatedImages: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    expiresAt: v.number(),
  })
    .index("by_expiresAt", ["expiresAt"])
    .index("by_userId", ["userId"]),

  mediaFiles: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    messageSid: v.string(),
    mediaType: v.string(),
    expiresAt: v.number(),
    /** Voice note transcript — cached to avoid re-calling Whisper on reply. */
    transcript: v.optional(v.string()),
  })
    .index("by_messageSid", ["messageSid"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_userId", ["userId"]),

  processedWebhooks: defineTable({
    messageSid: v.string(),
    processedAt: v.number(),
  })
    .index("by_messageSid", ["messageSid"])
    .index("by_processedAt", ["processedAt"]),

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
    cronExpr: v.optional(v.string()),
    timezone: v.optional(v.string()),
    schedulerJobId: v.optional(v.id("_scheduled_functions")),
  })
    .index("by_userId", ["userId"])
    .index("by_runAt", ["runAt"])
    .index("by_status_runAt", ["status", "runAt"])
    .index("by_userId_status", ["userId", "status"]),
});
