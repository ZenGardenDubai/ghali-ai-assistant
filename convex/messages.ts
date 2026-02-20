import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ghaliAgent } from "./agent";
import { getCurrentDateTime, fillTemplate, isSystemCommand } from "./lib/utils";
import { buildUserContext } from "./lib/userFiles";
import { TEMPLATES } from "./templates";
import { handleSystemCommand } from "./lib/systemCommands";
import { handleOnboarding } from "./lib/onboarding";
import { isAudioType } from "./lib/voice";
import { CREDITS_BASIC, CREDITS_PRO } from "./constants";

/**
 * Try to parse a generateImage tool result (JSON with imageUrl + caption).
 * Returns the URL and caption, or null if not an image result.
 */
export function parseImageToolResult(
  text: string
): { imageUrl: string; caption: string } | null {
  try {
    const parsed = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.imageUrl === "string" &&
      typeof parsed.caption === "string"
    ) {
      return { imageUrl: parsed.imageUrl, caption: parsed.caption };
    }
  } catch {
    // Not JSON — not an image tool result
  }
  return null;
}

/**
 * Scan all tool results from generateText steps for an image generation result.
 * The generateImage tool returns JSON: { imageUrl, caption }.
 * We check tool results directly since Flash may not relay the URL in its text.
 */
export function extractImageFromSteps(
  steps: Array<{ toolResults: Array<Record<string, unknown>> }>
): { imageUrl: string; caption: string } | null {
  for (const step of steps) {
    for (const toolResult of step.toolResults) {
      // @convex-dev/agent uses "output" instead of "result"
      const text = toolResult.output ?? toolResult.result;
      if (typeof text === "string") {
        const match = parseImageToolResult(text);
        if (match) return match;
      }
    }
  }
  return null;
}

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
  handler: async (ctx, args) => {
    const { userId } = args;
    let { body, mediaUrl, mediaContentType } = args;
    const typedUserId = userId as Id<"users">;

    // Get user info
    const user = await ctx.runQuery(internal.users.internalGetUser, {
      userId: typedUserId,
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    // Onboarding intercept — before credit check (onboarding is free)
    if (user.onboardingStep != null && !isSystemCommand(body)) {
      const result = await handleOnboarding(user.onboardingStep, body, user);

      // Apply user field updates (name, timezone, language, onboardingStep)
      const userUpdates: Record<string, unknown> = {
        onboardingStep: result.nextStep,
      };
      if (result.updates?.name) userUpdates.name = result.updates.name;
      if (result.updates?.timezone)
        userUpdates.timezone = result.updates.timezone;
      if (result.updates?.language)
        userUpdates.language = result.updates.language;

      await ctx.runMutation(internal.users.internalUpdateUser, {
        userId: typedUserId,
        fields: userUpdates as {
          name?: string;
          language?: string;
          timezone?: string;
          onboardingStep?: number | null;
        },
      });

      // Apply file updates (memory, personality)
      if (result.fileUpdates?.memory) {
        await ctx.runMutation(internal.users.internalUpdateUserFile, {
          userId: typedUserId,
          filename: "memory",
          content: result.fileUpdates.memory,
        });
      }
      if (result.fileUpdates?.personality) {
        await ctx.runMutation(internal.users.internalUpdateUserFile, {
          userId: typedUserId,
          filename: "personality",
          content: result.fileUpdates.personality,
        });
      }

      // If skipToAI, fall through to normal AI flow
      if (!result.skipToAI) {
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: result.response,
        });
        return;
      }
      // Fall through to AI with onboarding already marked done (nextStep: null)
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
      const maxCredits = user.tier === "pro" ? CREDITS_PRO : CREDITS_BASIC;
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

    // Build user context from per-user files + datetime
    const { date, time, tz } = getCurrentDateTime(user.timezone);
    const userContext = buildUserContext(userFiles, { date, time, tz });

    // Voice note intercept — transcribe audio before AI processing
    if (mediaUrl && mediaContentType && isAudioType(mediaContentType)) {
      const transcript = await ctx.runAction(
        internal.voice.transcribeVoiceMessage,
        { mediaUrl, mediaType: mediaContentType }
      );

      if (!transcript) {
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: TEMPLATES.voice_transcription_failed.template,
        });
        return;
      }

      // Replace body with transcript, clear media fields
      body = transcript;
      mediaUrl = undefined;
      mediaContentType = undefined;
    }

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
    let imageResult: { imageUrl: string; caption: string } | null = null;
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

      // Check tool results directly for image generation output
      imageResult = extractImageFromSteps(result.steps);
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

    if (imageResult) {
      // Send generated image as WhatsApp media, fall back to text if media fails
      try {
        await ctx.runAction(internal.twilio.sendMedia, {
          to: user.phone,
          caption: imageResult.caption,
          mediaUrl: imageResult.imageUrl,
        });
      } catch (error) {
        console.error("sendMedia failed, falling back to text:", error);
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: imageResult.caption,
        });
      }
    } else if (responseText) {
      await ctx.runAction(internal.twilio.sendMessage, {
        to: user.phone,
        body: responseText,
      });
    }
  },
});
