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
    optedOut: v.optional(v.boolean()),
    /** @deprecated — kept temporarily for schema compatibility during migration. Will be removed once all records are cleaned. */
    dormant: v.optional(v.boolean()),
    pendingAction: v.optional(v.union(
      v.literal("clear_memory"),
      v.literal("clear_documents"),
      v.literal("clear_schedules"),
      v.literal("clear_everything"),
      v.literal("admin_broadcast"),
      v.literal("delete_account")
    )),
    pendingActionAt: v.optional(v.number()),
    pendingPayload: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    /** Timestamp of last outbound message — used for outbound rate guard */
    lastOutboundAt: v.optional(v.number()),
    /** Number of outbound messages in the current minute window */
    outboundCountInWindow: v.optional(v.number()),
    /** Start of the current outbound rate window (epoch ms) */
    outboundWindowStart: v.optional(v.number()),
    consecutiveErrors: v.optional(v.number()),
    errorBackoffUntil: v.optional(v.number()),
    /** Daily proactive outbound count (heartbeat, reminders, tasks, broadcasts) */
    dailyProactiveSentCount: v.optional(v.number()),
    /** Next reset time for daily proactive window (epoch ms, next Dubai midnight) */
    dailyProactiveResetAt: v.optional(v.number()),
    /** Daily template message count (Meta enforces ~2/day cross-brand cap) */
    dailyTemplateSentCount: v.optional(v.number()),
    /** Next reset time for daily template window (epoch ms, next Dubai midnight) */
    dailyTemplateResetAt: v.optional(v.number()),
    /** Set when WhatsApp reports user blocked our number */
    blocked: v.optional(v.boolean()),
    /** Timestamp of last confirmed message delivery (from status webhook) */
    lastDeliveredAt: v.optional(v.number()),
    /** Timestamp of last confirmed message read (from status webhook) */
    lastReadAt: v.optional(v.number()),
    /** When user first opted into proactive messages (created reminder/task/heartbeat) */
    proactiveOptInAt: v.optional(v.number()),
    /** Timestamp when user accepted the Terms of Service (required before service access) */
    termsAcceptedAt: v.optional(v.number()),
    /** Timestamp when terms prompt was last sent (re-sent after 24h if not accepted) */
    termsPromptSentAt: v.optional(v.number()),
    personalityBootstrapped: v.optional(v.boolean()),
    /** Number of user messages since last reflection agent run */
    messagesSinceReflection: v.optional(v.number()),
    /** Timestamp of last reflection agent run */
    lastReflectionAt: v.optional(v.number()),
    /** Lifetime message count (used for adaptive reflection threshold) */
    totalMessages: v.optional(v.number()),
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
      v.literal("heartbeat"),
      v.literal("profile")
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

  proWriteBriefs: defineTable({
    userId: v.id("users"),
    brief: v.string(),
    questions: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),

  items: defineTable({
    userId: v.id("users"),
    collectionId: v.optional(v.id("collections")),

    // Core fields
    title: v.string(),
    body: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("done"), v.literal("archived")),

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
    reminderJobId: v.optional(v.id("scheduledJobs")),
    reminderCronId: v.optional(v.string()),
    scheduledTaskId: v.optional(v.id("scheduledTasks")),
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

  scheduledTasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    schedule: v.union(
      v.object({ kind: v.literal("cron"), expr: v.string() }),
      v.object({ kind: v.literal("once"), runAt: v.number() })
    ),
    timezone: v.string(),
    deliveryFormat: v.optional(v.string()),
    enabled: v.boolean(),
    lastRunAt: v.optional(v.number()),
    lastStatus: v.optional(
      v.union(
        v.literal("success"),
        v.literal("skipped_no_credits"),
        v.literal("error")
      )
    ),
    creditNotificationSent: v.optional(v.boolean()),
    disabledByOptOut: v.optional(v.boolean()),
    retryCount: v.optional(v.number()),
    schedulerJobId: v.optional(v.id("_scheduled_functions")),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_enabled", ["userId", "enabled"]),

  feedbackTokens: defineTable({
    token: v.string(),
    phone: v.string(),
    expiresAt: v.number(),
    used: v.boolean(),
  })
    .index("by_token", ["token"])
    .index("by_expiresAt", ["expiresAt"]),

  /** Maps WhatsApp message IDs (wamid) to template names for delivery quality tracking.
   *  Entries are short-lived — cleaned up by cron after 48h. */
  outboundMessages: defineTable({
    wamid: v.string(),
    templateName: v.string(),
    phone: v.string(),
    sentAt: v.number(),
  })
    .index("by_wamid", ["wamid"])
    .index("by_sentAt", ["sentAt"]),

  appConfig: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  feedback: defineTable({
    userId: v.id("users"),
    phone: v.string(),
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
    status: v.union(
      v.literal("new"),
      v.literal("read"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("archived")
    ),
    adminNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),
});
