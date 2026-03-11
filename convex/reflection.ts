import { v } from "convex/values";
import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { internalMutation, internalAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { MODELS } from "./models";
import { isFileTooLarge } from "./lib/userFiles";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Title used to tag reflection threads (excluded from chat thread lookups) */
const REFLECTION_THREAD_TITLE = "__reflection__";
/** Reflection threshold for new users (first 30 messages) */
export const REFLECTION_THRESHOLD_NEW = 5;
/** Reflection threshold for established users (30+ messages) */
export const REFLECTION_THRESHOLD_ESTABLISHED = 15;
/** Messages before a user is considered "established" */
export const REFLECTION_NEW_USER_CUTOFF = 30;
/** Time-based fallback: trigger reflection if unreflected messages older than this */
export const REFLECTION_TIME_FALLBACK_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Get the reflection threshold for a user based on their total message count.
 */
export function getReflectionThreshold(totalMessages: number): number {
  return totalMessages < REFLECTION_NEW_USER_CUTOFF
    ? REFLECTION_THRESHOLD_NEW
    : REFLECTION_THRESHOLD_ESTABLISHED;
}

// ---------------------------------------------------------------------------
// Reflection Agent — Tools (write-only subset of main agent tools)
// ---------------------------------------------------------------------------

const reflectionAppendToMemory = createTool({
  description:
    "Append behavioral observations to the user's memory file under a specific category.",
  args: z.object({
    category: z
      .enum(["preferences", "schedule", "interests", "general"])
      .describe(
        "preferences (communication style, likes/dislikes), schedule (availability patterns), interests (hobbies, topics), general (anything else)"
      ),
    content: z
      .string()
      .describe("New bullet points to append (e.g. '- Prefers concise responses\\n- Active late evenings')"),
  }),
  handler: async (ctx, { category, content }) => {
    if (!ctx.userId) return JSON.stringify({ status: "error", code: "NO_USER_CONTEXT" });
    const result = await ctx.runMutation(internal.users.internalAppendMemory, {
      userId: ctx.userId as Id<"users">,
      category,
      content,
    }) as { compactionScheduled: boolean };
    return JSON.stringify({
      status: "success",
      action: "memory_appended",
      category,
      compactionScheduled: result.compactionScheduled,
    });
  },
});

const reflectionEditMemory = createTool({
  description:
    "Edit or delete a specific fact in the user's memory. Use when an observation has changed or is outdated.",
  args: z.object({
    search: z.string().describe("Exact text to find in the memory file"),
    replacement: z.string().describe("Text to replace with. Use empty string to delete."),
  }),
  handler: async (ctx, { search, replacement }) => {
    if (!ctx.userId) return JSON.stringify({ status: "error", code: "NO_USER_CONTEXT" });
    const result = await ctx.runMutation(internal.users.internalEditMemory, {
      userId: ctx.userId as Id<"users">,
      search,
      replacement,
    }) as { found: boolean };
    if (!result.found) {
      return JSON.stringify({ status: "error", code: "TEXT_NOT_FOUND", message: "Could not find that text in memory." });
    }
    return JSON.stringify({
      status: "success",
      action: replacement === "" ? "memory_deleted" : "memory_edited",
    });
  },
});

const reflectionUpdateProfile = createTool({
  description:
    "Replace a section of the user's profile with updated content. Use for identity facts the user revealed casually in conversation.",
  args: z.object({
    category: z
      .enum(["personal", "professional", "education", "family", "location", "links", "milestones"])
      .describe("Profile section to update"),
    content: z
      .string()
      .describe("Full updated content for the section — replaces existing content entirely"),
  }),
  handler: async (ctx, { category, content }) => {
    if (!ctx.userId) return JSON.stringify({ status: "error", code: "NO_USER_CONTEXT" });
    const trimmed = content.trim();
    if (!trimmed) {
      return JSON.stringify({ status: "error", code: "EMPTY_CONTENT", message: "Profile section cannot be empty." });
    }
    if (isFileTooLarge(trimmed)) {
      return JSON.stringify({ status: "error", code: "FILE_TOO_LARGE", message: "Profile section exceeds limit." });
    }
    await ctx.runMutation(internal.users.internalUpdateProfileSection, {
      userId: ctx.userId as Id<"users">,
      category,
      content: trimmed,
    });
    return JSON.stringify({ status: "success", action: "profile_updated", category });
  },
});

const reflectionUpdatePersonality = createTool({
  description:
    "Update the user's personality preferences based on observed communication patterns (tone, verbosity, emoji style).",
  args: z.object({
    content: z
      .string()
      .describe("The full updated user personality block (markdown)"),
  }),
  handler: async (ctx, { content }) => {
    if (!ctx.userId) return JSON.stringify({ status: "error", code: "NO_USER_CONTEXT" });
    if (isFileTooLarge(content)) {
      return JSON.stringify({ status: "error", code: "FILE_TOO_LARGE", message: "Personality file exceeds limit." });
    }
    await ctx.runMutation(internal.users.internalUpdateUserFile, {
      userId: ctx.userId as Id<"users">,
      filename: "personality",
      content,
    });
    return JSON.stringify({ status: "success", action: "personality_updated" });
  },
});

// ---------------------------------------------------------------------------
// Reflection Agent — Prompt
// ---------------------------------------------------------------------------

const REFLECTION_INSTRUCTIONS = `You are a background reflection agent reviewing recent conversation messages between Ghali (AI assistant) and a user.

Your job is to identify patterns and facts worth remembering. You have access to the user's current profile, memory, and personality files.

OBSERVE AND UPDATE:
- Identity facts the user revealed casually (job change, moved cities, new hobby, birthday mentioned) → updateProfile
- Behavioral patterns across multiple messages (prefers short answers, asks follow-ups, code-switches between languages, active times of day) → appendToMemory
- Communication style shifts (became more formal, started using emoji, prefers bullet points) → updatePersonality
- Corrections to existing facts (moved to a new city, changed jobs) → editMemory / updateProfile

DO NOT:
- Duplicate facts already in the user's files — check before adding
- Store trivial observations ("user said hello", "user asked about weather")
- Store time-specific events (reminders, appointments) — those use scheduled tasks
- Store notes, tasks, or expenses — those use the items system
- Generate any user-facing text — your output is tool calls only. If nothing worth noting, make zero tool calls.

Be selective. Only store genuinely notable patterns, not every interaction.`;

// ---------------------------------------------------------------------------
// Reflection Agent — Definition
// ---------------------------------------------------------------------------

export const reflectionAgent = new Agent(components.agent, {
  name: "Reflection",
  languageModel: google(MODELS.FLASH),
  textEmbeddingModel: openai.embedding(MODELS.EMBEDDING),
  instructions: REFLECTION_INSTRUCTIONS,
  tools: {
    appendToMemory: reflectionAppendToMemory,
    editMemory: reflectionEditMemory,
    updateProfile: reflectionUpdateProfile,
    updatePersonality: reflectionUpdatePersonality,
  },
  maxSteps: 8,
  usageHandler: async (ctx, { userId, usage, model, provider }) => {
    if (!userId) return;
    try {
      const user = await ctx.runQuery(internal.users.internalGetUser, {
        userId: userId as Id<"users">,
      }) as { phone: string; tier: string } | null;
      if (!user) return;

      await ctx.runMutation(internal.analyticsHelper.scheduleTrackAIGeneration, {
        phone: user.phone,
        model,
        provider,
        promptTokens: usage.inputTokens ?? 0,
        completionTokens: usage.outputTokens ?? 0,
        tier: user.tier,
        source: "reflection",
      });
    } catch (error) {
      console.error("[Analytics] reflection usageHandler failed:", error);
    }
  },
});

// ---------------------------------------------------------------------------
// Counter Mutation — called after each successful AI response
// ---------------------------------------------------------------------------

/**
 * Increment the reflection counter and total message count.
 * Returns the new counter value and the threshold for this user.
 */
export const incrementReflectionCounter = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { count: 0, threshold: REFLECTION_THRESHOLD_ESTABLISHED, shouldReflect: false };

    const newCount = (user.messagesSinceReflection ?? 0) + 1;
    const newTotal = (user.totalMessages ?? 0) + 1;
    const threshold = getReflectionThreshold(newTotal);
    const shouldReflect = newCount >= threshold;

    await ctx.db.patch(userId, {
      // Reset counter atomically when threshold reached to prevent duplicate triggers
      messagesSinceReflection: shouldReflect ? 0 : newCount,
      totalMessages: newTotal,
      ...(shouldReflect ? { lastReflectionAt: Date.now() } : {}),
    });

    return { count: newCount, threshold, shouldReflect };
  },
});

/**
 * Reset the reflection counter after a successful reflection run.
 */
export const resetReflectionCounter = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, {
      messagesSinceReflection: 0,
      lastReflectionAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Run Reflection — the background action
// ---------------------------------------------------------------------------

export const runReflection = internalAction({
  args: {
    userId: v.id("users"),
    trigger: v.optional(v.string()), // "counter" or "time_fallback"
    messagesReviewed: v.optional(v.number()), // passed by counter trigger (counter already reset to 0)
  },
  handler: async (ctx, { userId, trigger, messagesReviewed: passedCount }) => {
    const triggerType = trigger ?? "counter";
    const startMs = Date.now();

    // Load user
    const user = await ctx.runQuery(internal.users.internalGetUser, {
      userId,
    }) as {
      phone: string;
      tier: string;
      optedOut?: boolean;
      dormant?: boolean;
      totalMessages?: number;
      messagesSinceReflection?: number;
    } | null;

    if (!user) return;

    // Skip opted-out or dormant users
    if (user.optedOut || user.dormant) {
      await ctx.runAction(internal.analytics.trackReflectionSkipped, {
        phone: user.phone,
        reason: user.optedOut ? "opted_out" : "dormant",
      });
      await ctx.runMutation(internal.reflection.resetReflectionCounter, { userId });
      return;
    }

    // Counter triggers pass the count directly (counter is already reset to 0 in DB).
    // Time-fallback triggers read from the DB.
    const messagesReviewed = passedCount ?? (user.messagesSinceReflection ?? 0);
    if (messagesReviewed === 0) {
      return; // Nothing to reflect on
    }

    const threshold = getReflectionThreshold(user.totalMessages ?? 0);

    // Load user files for context
    const userFiles = await ctx.runQuery(
      internal.users.internalGetUserFiles,
      { userId }
    ) as Array<{ filename: string; content: string }>;

    // Find the user's existing chat threads (exclude reflection threads)
    const threadsResult = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: userId as string,
        order: "desc",
        paginationOpts: { numItems: 10, cursor: null },
      }
    );

    const chatThreads = threadsResult.page.filter(
      (t) => t.title !== REFLECTION_THREAD_TITLE
    );

    if (chatThreads.length === 0) {
      await ctx.runMutation(internal.reflection.resetReflectionCounter, { userId });
      return;
    }

    // Read recent messages from the user's most recent chat thread
    const userThreadId = chatThreads[0]._id;
    const messagesResult = await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        threadId: userThreadId,
        order: "desc" as const,
        paginationOpts: { numItems: messagesReviewed * 2 + 10, cursor: null },
        excludeToolMessages: true,
        statuses: ["success"],
      }
    );

    const recentMessages = messagesResult.page.reverse(); // oldest first

    if (recentMessages.length === 0) {
      await ctx.runMutation(internal.reflection.resetReflectionCounter, { userId });
      return;
    }

    // Build context for the reflection agent
    const fileContext = userFiles
      .filter((f) => f.content)
      .map((f) => `## Current ${f.filename} file\n${f.content}`)
      .join("\n\n");

    const conversationText = recentMessages
      .map((m) => {
        const role = m.message && typeof m.message === "object" && "role" in m.message
          ? (m.message as { role: string }).role
          : "unknown";
        const text = m.text || "(no text)";
        return `[${role}]: ${text}`;
      })
      .join("\n\n");

    const prompt = `${fileContext}\n\n---\n\n## Recent conversation (${recentMessages.length} messages)\n\n${conversationText}`;

    // Run reflection agent in its own dedicated thread (tagged to exclude from chat lookups)
    const { threadId: reflectionThreadId } = await reflectionAgent.createThread(ctx, {
      userId: userId as string,
      title: REFLECTION_THREAD_TITLE,
    });

    let toolsUsed: string[] = [];
    let totalToolCalls = 0;
    try {
      const result = await reflectionAgent.generateText(
        ctx,
        { threadId: reflectionThreadId },
        { prompt }
      );

      // Extract tools used
      const allToolCalls = result.steps.flatMap(
        (s: { toolCalls: Array<{ toolName: string }> }) =>
          s.toolCalls.map((tc: { toolName: string }) => tc.toolName)
      );
      totalToolCalls = allToolCalls.length;
      toolsUsed = [...new Set(allToolCalls)];
    } catch (error) {
      console.error(`[reflection] Failed for user ${userId}:`, error);
      await ctx.runAction(internal.analytics.trackReflectionSkipped, {
        phone: user.phone,
        reason: "error",
      });
      // Reset counter for time-fallback triggers to prevent infinite retry loop
      // (counter-triggered reflections are already reset atomically in incrementReflectionCounter)
      if (triggerType === "time_fallback") {
        await ctx.runMutation(internal.reflection.resetReflectionCounter, { userId });
      }
      return;
    }

    // Reset counter for time-fallback triggers (counter triggers are already reset atomically)
    if (triggerType === "time_fallback") {
      await ctx.runMutation(internal.reflection.resetReflectionCounter, { userId });
    }

    // Track analytics
    await ctx.runAction(internal.analytics.trackReflectionRan, {
      phone: user.phone,
      tier: user.tier,
      messages_reviewed: recentMessages.length,
      tools_called: toolsUsed,
      tools_called_count: totalToolCalls,
      trigger: triggerType,
      threshold,
      duration_ms: Date.now() - startMs,
    });
  },
});
