import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ghaliAgent } from "./agent";
import { getCurrentDateTime, fillTemplate } from "./lib/utils";
import { TEMPLATES } from "./templates";
import { handleSystemCommand } from "./lib/systemCommands";

/**
 * Save an incoming WhatsApp message and schedule async processing.
 * Called by the HTTP webhook handler.
 */
export const saveIncoming = internalMutation({
  args: {
    userId: v.id("users"),
    body: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaContentType: v.optional(v.string()),
  },
  handler: async (ctx, { userId, body, mediaUrl, mediaContentType }) => {
    // Schedule async response generation
    await ctx.scheduler.runAfter(0, internal.messages.generateResponse, {
      userId: userId as string,
      body,
      mediaUrl,
      mediaContentType,
    });
  },
});

/**
 * Generate an AI response and send it via WhatsApp.
 * Runs asynchronously after the webhook returns 200.
 */
export const generateResponse = internalAction({
  args: {
    userId: v.string(),
    body: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaContentType: v.optional(v.string()),
  },
  handler: async (ctx, { userId, body, mediaUrl, mediaContentType }) => {
    const typedUserId = userId as Id<"users">;

    // Get user info
    const user = await ctx.runQuery(internal.users.internalGetUser, {
      userId: typedUserId,
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    // Check credit availability (no deduction yet — only deduct after successful response)
    const creditCheck = await ctx.runQuery(internal.credits.checkCredit, {
      userId: typedUserId,
      message: body,
    });

    // Load user files early — needed for both system commands and AI context
    const userFiles = await ctx.runQuery(
      internal.users.internalGetUserFiles,
      { userId: typedUserId }
    );

    // Handle system commands via templates (no AI generation)
    if (creditCheck.status === "free") {
      const systemResponse = await handleSystemCommand(
        body,
        user,
        userFiles,
        body
      );
      if (systemResponse) {
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: systemResponse,
        });
        return;
      }
      // "account" or unrecognized → fall through to AI
    }

    // Handle exhausted credits
    if (creditCheck.status === "exhausted") {
      const maxCredits = user.tier === "pro" ? 600 : 60;
      const resetDate = new Date(user.creditsResetAt).toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric", year: "numeric" }
      );
      const templateKey =
        user.tier === "pro"
          ? "credits_exhausted_pro"
          : "credits_exhausted_basic";
      const message = fillTemplate(TEMPLATES[templateKey].template, {
        maxCredits,
        resetDate,
      });
      await ctx.runAction(internal.twilio.sendMessage, {
        to: user.phone,
        body: message,
      });
      return;
    }

    const memoryFile = userFiles.find((f) => f.filename === "memory");
    const personalityFile = userFiles.find((f) => f.filename === "personality");
    const heartbeatFile = userFiles.find((f) => f.filename === "heartbeat");

    // Inject current date/time context
    const { date, time, tz } = getCurrentDateTime(user.timezone);
    const contextParts: string[] = [
      `CURRENT CONTEXT:\nToday is ${date}\nCurrent time: ${time} (${tz})`,
    ];
    if (personalityFile?.content) {
      contextParts.push(`## User Personality Preferences\n${personalityFile.content}`);
    }
    if (memoryFile?.content) {
      contextParts.push(`## User Memory\n${memoryFile.content}`);
    }
    if (heartbeatFile?.content) {
      contextParts.push(`## User Heartbeat/Reminders\n${heartbeatFile.content}`);
    }

    const userContext = contextParts.length > 0
      ? contextParts.join("\n\n")
      : "";

    // Build prompt
    let prompt = body;
    if (mediaUrl && mediaContentType) {
      prompt = `[Media attached: ${mediaContentType}${body ? ` — "${body}"` : ""}]\nMedia URL: ${mediaUrl}`;
    }

    // Get or create thread for this user
    const { threadId } = await ghaliAgent.createThread(ctx, {
      userId,
    });

    // Generate response
    let responseText: string | undefined;
    let aiSucceeded = false;
    try {
      const result = await ghaliAgent.generateText(
        ctx,
        { threadId },
        {
          prompt: userContext
            ? `${userContext}\n\n---\nUser message: ${prompt}`
            : prompt,
        }
      );
      responseText = result.text;
      aiSucceeded = true;
    } catch (error) {
      console.error("Agent generateText failed:", error);
      responseText = "Sorry, I ran into an issue processing your message. Please try again.";
    }

    // Only deduct credit after successful AI response
    if (aiSucceeded && creditCheck.status === "available") {
      await ctx.runMutation(internal.credits.deductCredit, {
        userId: typedUserId,
      });
    }

    if (responseText) {
      // Send reply via Twilio
      await ctx.runAction(internal.twilio.sendMessage, {
        to: user.phone,
        body: responseText,
      });
    }
  },
});
