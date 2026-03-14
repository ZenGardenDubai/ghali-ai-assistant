import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ghaliAgent, getOrCreateChatThread, SYSTEM_BLOCK, setTraceId, clearTraceId } from "./agent";
import { getCurrentDateTime } from "./lib/utils";
import { buildUserContext } from "./lib/userFiles";
import { WHATSAPP_SESSION_WINDOW_MS, TEMPLATE_INACTIVITY_GATE_MS } from "./constants";
import { REFLECTION_TIME_FALLBACK_MS } from "./reflection";

/**
 * Cron target: find all users with non-empty heartbeat files
 * and schedule individual heartbeat processing for each.
 */
export const processHeartbeats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();

    for (const user of allUsers) {
      // Skip opted-out, blocked, or inactive (>7 days) users
      if (user.optedOut || user.blocked) continue;
      if (!user.lastMessageAt || Date.now() - user.lastMessageAt > TEMPLATE_INACTIVITY_GATE_MS) continue;

      // Check heartbeat file and schedule processing if non-empty
      const heartbeatFile = await ctx.db
        .query("userFiles")
        .withIndex("by_userId_filename", (q) =>
          q.eq("userId", user._id).eq("filename", "heartbeat")
        )
        .unique();

      if (heartbeatFile?.content?.trim()) {
        await ctx.scheduler.runAfter(0, internal.heartbeat.processUserHeartbeat, {
          userId: user._id,
        });
      }

      // Time-based reflection fallback: trigger reflection for users with
      // unreflected messages older than 4 hours (catches quiet users who
      // never hit the counter threshold)
      if (
        (user.messagesSinceReflection ?? 0) > 0 &&
        Date.now() - user.lastMessageAt > REFLECTION_TIME_FALLBACK_MS
      ) {
        await ctx.scheduler.runAfter(0, internal.reflection.runReflection, {
          userId: user._id,
          trigger: "time_fallback",
        });
      }
    }
  },
});

/**
 * Process a single user's heartbeat: evaluate with Flash,
 * send WhatsApp message if anything is due.
 */
export const processUserHeartbeat = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Load user
    const user = await ctx.runQuery(internal.users.internalGetUser, { userId });
    if (!user) return;

    // Re-check opt-out/blocked/inactivity (user may have changed state after processHeartbeats enqueued this)
    if (user.optedOut || user.blocked) return;
    if (!user.lastMessageAt || Date.now() - user.lastMessageAt > TEMPLATE_INACTIVITY_GATE_MS) return;

    // Circuit breaker: skip if user is in error backoff
    if (user.errorBackoffUntil && Date.now() < user.errorBackoffUntil) {
      console.log(`[circuit-breaker] Heartbeat skipped for user ${userId} — in error backoff`);
      return;
    }

    // Load user files
    const userFiles = await ctx.runQuery(internal.users.internalGetUserFiles, {
      userId,
    });

    // Race condition guard: verify heartbeat has content
    const heartbeatFile = (userFiles as Array<{ filename: string; content: string }>).find((f) => f.filename === "heartbeat");
    if (!heartbeatFile?.content?.trim()) return;

    // Build context
    const datetime = getCurrentDateTime(user.timezone);
    const userContext = buildUserContext(
      userFiles,
      datetime,
      { language: user.language, timezone: user.timezone }
    );

    // Get the user's existing chat thread, or create one if none exists yet.
    // Using getOrCreateChatThread instead of createThread directly, because
    // createThread always inserts a new thread and would lose all history.
    const threadId = await getOrCreateChatThread(ctx, userId as string);

    const prompt = `${userContext}

---
HEARTBEAT CHECK (proactive, system-initiated — not a user message):

Review the user's heartbeat/reminders above against the current date and time.
If any item is due NOW (within this hour), compose a natural, friendly WhatsApp message to the user about it.
If nothing is due right now, respond with exactly: __SKIP__

Rules:
${SYSTEM_BLOCK}
- This is a proactive check-in, not a response to a user message
- Be natural — don't say "according to your heartbeat file" or mention the system
- If multiple items are due, combine them into one message
- Format for WhatsApp: use *bold*, _italic_, plain text — no markdown headers or code blocks
- Keep it concise and actionable
- After sending a one-shot reminder (not recurring), call updateHeartbeat to remove it from the list. Keep all recurring items.`;

    // Set per-request trace ID for PostHog LLM analytics
    setTraceId(crypto.randomUUID());

    // AI call — circuit breaker scope (only AI errors count)
    let responseText: string | undefined;
    try {
      const result = await ghaliAgent.generateText(ctx, { threadId }, { prompt });
      responseText = result.text;
      await ctx.runMutation(internal.users.resetApiErrors, { userId });
    } catch (error) {
      console.error(`Heartbeat AI failed for user ${userId}:`, error);
      await ctx.runMutation(internal.users.recordApiError, { userId });
      return;
    } finally {
      clearTraceId();
    }

    // Delivery — WhatsApp API failures don't trip the circuit breaker
    // Guarded to respect outbound rate limits (prevents flood from concurrent system sends)
    if (responseText && !responseText.includes("__SKIP__")) {
      // Re-fetch user to catch STOP sent or inactivity crossed during AI generation
      const latestUser = await ctx.runQuery(internal.users.internalGetUser, { userId });
      if (!latestUser || latestUser.optedOut || latestUser.blocked) return;
      if (!latestUser.lastMessageAt || Date.now() - latestUser.lastMessageAt > TEMPLATE_INACTIVITY_GATE_MS) return;

      // Check daily proactive limit before outbound rate guard
      const proactiveGuard = await ctx.runMutation(
        internal.outboundGuard.checkAndRecordProactiveSend,
        { userId }
      );
      if (!proactiveGuard.allowed) {
        console.warn(`[proactive-guard] Heartbeat blocked for ${userId}: ${proactiveGuard.reason}`);
        return;
      }

      // Check outbound rate guard before sending
      const guard = await ctx.runMutation(
        internal.outboundGuard.checkAndRecordOutbound,
        { userId }
      );
      if (!guard.allowed) {
        console.warn(`[outbound-guard] Heartbeat blocked for ${userId}: ${guard.reason}`);
        await ctx.runMutation(internal.outboundGuard.rollbackProactiveSend, { userId });
        return;
      }

      const latestWithinWindow =
        latestUser.lastMessageAt &&
        Date.now() - latestUser.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;

      try {
        if (latestWithinWindow) {
          await ctx.runAction(internal.whatsapp.sendMessage, {
            to: latestUser.phone,
            body: responseText,
          });
        } else {
          // Outside 24h window — check daily template cap before sending
          const templateGuard = await ctx.runMutation(
            internal.outboundGuard.checkAndRecordTemplateSend,
            { userId }
          );
          if (!templateGuard.allowed) {
            console.warn(`[template-guard] Heartbeat template blocked for ${userId}: ${templateGuard.reason}`);
            await ctx.runMutation(internal.outboundGuard.rollbackProactiveSend, { userId });
            return;
          }
          try {
            await ctx.runAction(internal.whatsapp.sendTemplate, {
              to: latestUser.phone,
              templateName: "ghali_heartbeat",
              variables: { "1": responseText },
            });
          } catch (error) {
            await ctx.runMutation(internal.outboundGuard.rollbackTemplateSend, { userId });
            throw error;
          }
        }
      } catch (error) {
        await ctx.runMutation(internal.outboundGuard.rollbackProactiveSend, { userId });
        console.error(`Heartbeat delivery failed for user ${userId}:`, error);
      }
    }
  },
});
