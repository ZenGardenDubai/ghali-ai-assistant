import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ghaliAgent } from "./agent";

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

    // Load user files for context injection
    const userFiles = await ctx.runQuery(
      internal.users.internalGetUserFiles,
      { userId: typedUserId }
    );

    const memoryFile = userFiles.find((f) => f.filename === "memory");
    const personalityFile = userFiles.find((f) => f.filename === "personality");
    const heartbeatFile = userFiles.find((f) => f.filename === "heartbeat");

    // Build additional context from user files
    const contextParts: string[] = [];
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
    } catch (error) {
      console.error("Agent generateText failed:", error);
      responseText = "Sorry, I ran into an issue processing your message. Please try again.";
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
