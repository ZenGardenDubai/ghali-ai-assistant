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
      v.literal("cancelled"),
      v.literal("failed")
    ),
    cronExpr: v.optional(v.string()),
    timezone: v.optional(v.string()),
    schedulerJobId: v.optional(v.id("_scheduled_functions")),
  })
    .index("by_userId", ["userId"])
    .index("by_runAt", ["runAt"])
    .index("by_status_runAt", ["status", "runAt"])
    .index("by_userId_status", ["userId", "status"]),

  collections: defineTable({
    userId: v.id("users"),
    name: v.string(),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"]),

  items: defineTable({
    userId: v.id("users"),
    collectionId: v.optional(v.id("collections")),

    // Core fields
    title: v.string(),
    body: v.optional(v.string()),
    status: v.string(),

    // Queryable typed fields
    priority: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    reminderAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    // Flexible fields
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
    mediaStorageId: v.optional(v.id("_storage")),

    // Search
    embedding: v.optional(v.array(v.float64())),
    embeddingReady: v.optional(v.boolean()),

    // Reminder tracking
    reminderCronId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_collectionId", ["collectionId"])
    .index("by_userId_status", ["userId", "status"])
    .index("by_userId_dueDate", ["userId", "dueDate"])
    .index("by_userId_reminderAt", ["userId", "reminderAt"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "collectionId", "status"],
    }),
});
