import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ghaliAgent, SYSTEM_BLOCK } from "./agent";
import { getCurrentDateTime } from "./lib/utils";
import { buildUserContext } from "./lib/userFiles";
import { WHATSAPP_SESSION_WINDOW_MS } from "./constants";

/**
 * Cron target: find all users with non-empty heartbeat files
 * and schedule individual heartbeat processing for each.
 */
export const processHeartbeats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();

    for (const user of allUsers) {

      // Check heartbeat file
      const heartbeatFile = await ctx.db
        .query("userFiles")
        .withIndex("by_userId_filename", (q) =>
          q.eq("userId", user._id).eq("filename", "heartbeat")
        )
        .unique();

      if (!heartbeatFile?.content?.trim()) continue;

      // Schedule async processing
      await ctx.scheduler.runAfter(0, internal.heartbeat.processUserHeartbeat, {
        userId: user._id,
      });
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

    // Check WhatsApp 24h session window
    const withinWindow =
      user.lastMessageAt &&
      Date.now() - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;

    // Load user files
    const userFiles = await ctx.runQuery(internal.users.internalGetUserFiles, {
      userId,
    });

    // Race condition guard: verify heartbeat has content
    const heartbeatFile = userFiles.find((f) => f.filename === "heartbeat");
    if (!heartbeatFile?.content?.trim()) return;

    // Build context
    const datetime = getCurrentDateTime(user.timezone);
    const userContext = buildUserContext(userFiles, datetime);

    // Get or create thread (shared with normal conversation)
    const { threadId } = await ghaliAgent.createThread(ctx, {
      userId: userId as string,
    });

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

    try {
      const result = await ghaliAgent.generateText(
        ctx,
        { threadId },
        { prompt }
      );

      const responseText = result.text;

      // Only send if the agent has something to say
      if (responseText && !responseText.includes("__SKIP__")) {
        if (withinWindow) {
          await ctx.runAction(internal.twilio.sendMessage, {
            to: user.phone,
            body: responseText,
          });
        } else {
          // Outside 24h window — use Content Template
          await ctx.runAction(internal.twilio.sendTemplate, {
            to: user.phone,
            templateEnvVar: "TWILIO_TPL_HEARTBEAT",
            variables: { "1": responseText },
          });
        }
      }
    } catch (error) {
      console.error(`Heartbeat failed for user ${userId}:`, error);
    }
  },
});
