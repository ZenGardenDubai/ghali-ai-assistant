import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ghaliAgent } from "./agent";
import { MODELS } from "./models";
import { getCurrentDateTime, fillTemplate, classifyCommand, isSystemCommand, isAdminCommand, isAffirmative } from "./lib/utils";
import { buildUserContext } from "./lib/userFiles";
import { TEMPLATES } from "./templates";
import { handleSystemCommand, renderSystemMessage, translateMessage } from "./lib/systemCommands";
import { PENDING_ACTION_EXPIRY_MS } from "./constants";
import { handleAdminCommand } from "./lib/adminCommands";
import { handleOnboarding } from "./lib/onboarding";
import {
  isSupportedMediaType,
  isRagIndexable,
  isVoiceNote,
} from "./lib/media";
import { CREDITS_BASIC, CREDITS_PRO, CREDITS_LOW_THRESHOLD, MEDIA_RETENTION_MS } from "./constants";

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
      parsed.type === "image" &&
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
 * Try to parse a convertFile tool result (JSON with fileUrl + caption + outputFormat).
 * Returns the URL, caption, and format, or null if not a conversion result.
 */
export function parseConvertedFileResult(
  text: string
): { fileUrl: string; caption: string; outputFormat: string } | null {
  try {
    const parsed = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      parsed.type === "conversion" &&
      typeof parsed.fileUrl === "string" &&
      typeof parsed.caption === "string" &&
      typeof parsed.outputFormat === "string"
    ) {
      return {
        fileUrl: parsed.fileUrl,
        caption: parsed.caption,
        outputFormat: parsed.outputFormat,
      };
    }
  } catch {
    // Not JSON — not a conversion tool result
  }
  return null;
}

/**
 * Scan all tool results from generateText steps for a file conversion result.
 */
export function extractConvertedFileFromSteps(
  steps: Array<{ toolResults: Array<Record<string, unknown>> }>
): { fileUrl: string; caption: string; outputFormat: string } | null {
  for (const step of steps) {
    for (const toolResult of step.toolResults) {
      const text = toolResult.output ?? toolResult.result;
      if (typeof text === "string") {
        const match = parseConvertedFileResult(text);
        if (match) return match;
      }
    }
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
    messageSid: v.optional(v.string()),
    originalRepliedMessageSid: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, body, mediaUrl, mediaContentType, messageSid, originalRepliedMessageSid }
  ) => {
    // Track last message time for WhatsApp 24h session window
    await ctx.db.patch(userId, { lastMessageAt: Date.now() });

    // Schedule async response generation
    await ctx.scheduler.runAfter(0, internal.messages.generateResponse, {
      userId: userId as string,
      body,
      mediaUrl,
      mediaContentType,
      messageSid,
      originalRepliedMessageSid,
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
    messageSid: v.optional(v.string()),
    originalRepliedMessageSid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, messageSid, originalRepliedMessageSid } = args;
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

    // Track new vs returning user (fire-and-forget)
    // onboardingStep === 1 means first message ever (set at creation, cleared after onboarding)
    const isNewUser = user.onboardingStep === 1;
    if (isNewUser) {
      await ctx.scheduler.runAfter(0, internal.analytics.trackUserNew, {
        phone: user.phone,
        timezone: user.timezone,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.analytics.trackUserReturning, {
        phone: user.phone,
        tier: user.tier,
        credits_remaining: user.credits,
      });
    }

    // Classify command — resolves translated commands (e.g. "مساعدة" → "help")
    // During onboarding, use cheap English-only check to avoid unnecessary Flash calls.
    // Full Flash classification only runs outside onboarding.
    const canonicalCommand = user.onboardingStep != null
      ? (isSystemCommand(body) ? body.toLowerCase().trim() : null)
      : await classifyCommand(body);
    const messageForCredits = canonicalCommand ?? body;

    // Onboarding intercept — before credit check (onboarding is free)
    // Skip onboarding only if the message is an actual system command.
    if (user.onboardingStep != null && !canonicalCommand) {
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
        // Translate onboarding response to the user's language
        const lang = result.updates?.language ?? user.language ?? "en";
        const translatedResponse = await translateMessage(result.response, lang);
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: translatedResponse,
        });
        return;
      }
      // Fall through to AI with onboarding already marked done (nextStep: null)
    }

    // Check credit availability (no deduction yet — only deduct after successful response)
    const creditCheck = await ctx.runQuery(internal.credits.checkCredit, {
      userId: typedUserId,
      message: messageForCredits,
    });

    // Load user files early — needed for both system commands and AI context
    const userFiles = await ctx.runQuery(
      internal.users.internalGetUserFiles,
      { userId: typedUserId }
    );

    // Confirmation intercept — check for pending action before anything else
    if (user.pendingAction && user.pendingActionAt) {
      const isExpired = Date.now() - user.pendingActionAt > PENDING_ACTION_EXPIRY_MS;

      if (!isExpired && isAffirmative(body)) {
        const pendingAction = user.pendingAction;

        // Admin broadcast confirmation — re-verify admin status
        if (pendingAction === "admin_broadcast" && user.pendingPayload && user.isAdmin) {
          const result = await ctx.runAction(internal.admin.broadcastMessage, {
            message: user.pendingPayload,
          }) as { sentCount: number };

          await ctx.runMutation(internal.users.clearPendingAction, {
            userId: typedUserId,
          });

          const doneMessage = await renderSystemMessage(
            "admin_broadcast_done",
            { sentCount: result.sentCount },
            body
          );
          await ctx.runAction(internal.twilio.sendMessage, {
            to: user.phone,
            body: doneMessage,
          });
          return;
        }

        // Clear data confirmations
        if (
          pendingAction === "clear_memory" ||
          pendingAction === "clear_documents" ||
          pendingAction === "clear_everything"
        ) {
          // Get doc count for the "done" template (before deletion)
          let docCount = 0;
          if (pendingAction === "clear_documents" || pendingAction === "clear_everything") {
            docCount = await ctx.runQuery(internal.rag.getDocumentCount, {
              userId: userId,
            });
          }

          // Execute the appropriate clear action
          const clearActionMap = {
            clear_memory: internal.dataManagement.clearMemory,
            clear_documents: internal.dataManagement.clearDocuments,
            clear_everything: internal.dataManagement.clearEverything,
          } as const;
          await ctx.runAction(clearActionMap[pendingAction], { userId: typedUserId });

          // Send the "done" template
          const doneTemplateMap = {
            clear_memory: "clear_memory_done",
            clear_documents: "clear_documents_done",
            clear_everything: "clear_everything_done",
          } as const;
          const doneVars: Record<string, string | number> =
            pendingAction === "clear_documents"
              ? { docCount }
              : {};
          const doneMessage = await renderSystemMessage(
            doneTemplateMap[pendingAction],
            doneVars,
            body
          );
          await ctx.runAction(internal.twilio.sendMessage, {
            to: user.phone,
            body: doneMessage,
          });
          return;
        }
      }

      // Not affirmative or expired — clear pending action and fall through
      await ctx.runMutation(internal.users.clearPendingAction, {
        userId: typedUserId,
      });
      // Fall through to normal processing
    }

    // Handle system commands via templates (no AI generation)
    if (creditCheck.status === "free") {
      const docCount = await ctx.runQuery(internal.rag.getDocumentCount, {
        userId: userId,
      });

      const systemResult = await handleSystemCommand(
        messageForCredits,
        user,
        userFiles,
        body, // original message for language detection
        docCount
      );
      if (systemResult) {
        // Set pending action if this is a clear command
        if (systemResult.pendingAction) {
          await ctx.runMutation(internal.users.setPendingAction, {
            userId: typedUserId,
            action: systemResult.pendingAction,
          });
        }
        await ctx.scheduler.runAfter(0, internal.analytics.trackSystemCommand, {
          phone: user.phone,
          command: messageForCredits,
        });
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: systemResult.response,
        });
        return;
      }
      // Unrecognized command → fall through to AI
    }

    // Admin command intercept — free for admins, non-admins fall through to AI
    if (creditCheck.status === "free" && isAdminCommand(body) && user.isAdmin) {
      const adminResult = await handleAdminCommand(
        body,
        ctx,
        internal,
        body
      );
      if (adminResult) {
        if (adminResult.pendingAction) {
          await ctx.runMutation(internal.users.setPendingAction, {
            userId: typedUserId,
            action: adminResult.pendingAction,
            payload: adminResult.pendingPayload,
          });
        }
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: adminResult.response,
        });
        return;
      }
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
      await ctx.scheduler.runAfter(0, internal.analytics.trackCreditsExhausted, {
        phone: user.phone,
        tier: user.tier,
        reset_at: user.creditsResetAt,
      });
      await ctx.runAction(internal.twilio.sendMessage, {
        to: user.phone,
        body: message,
      });
      return;
    }

    // Rate limit check — only for AI generation requests
    const rateCheck = await ctx.runMutation(
      internal.rateLimiting.checkMessageRateLimit,
      { userId: typedUserId }
    );
    if (!rateCheck.ok) {
      const message = fillTemplate(TEMPLATES.rate_limited.template, {
        retryAfterSeconds: rateCheck.retryAfterSeconds,
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

    // Voice note intercept — transcribe and use as text prompt
    // WhatsApp voice notes (audio/ogg) are treated as spoken input, not files.
    // Other audio formats (mp3, m4a, etc.) are treated as files for Gemini analysis.
    if (mediaUrl && mediaContentType && isVoiceNote(mediaContentType)) {
      const voiceResult = await ctx.runAction(
        internal.voice.transcribeVoiceMessage,
        { mediaUrl, mediaType: mediaContentType }
      );

      if (!voiceResult) {
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: TEMPLATES.voice_transcription_failed.template,
        });
        return;
      }

      // Track voice note in mediaFiles with transcript for future reply-to-voice
      if (messageSid) {
        await ctx.runMutation(internal.mediaStorage.trackMediaFile, {
          userId: typedUserId,
          storageId: voiceResult.storageId,
          messageSid,
          mediaType: mediaContentType,
          expiresAt: Date.now() + MEDIA_RETENTION_MS,
          transcript: voiceResult.transcript,
        });
      }

      // Track voice note feature usage
      await ctx.scheduler.runAfter(0, internal.analytics.trackFeatureUsed, {
        phone: user.phone,
        feature: "voice_note",
        tier: user.tier,
      });

      // Replace body with transcript, clear media fields
      body = voiceResult.transcript;
      mediaUrl = undefined;
      mediaContentType = undefined;
    }

    // Initialize prompt — may be replaced below by media processing or voice transcript
    let prompt = body;

    // Reply-to-media: if replying to a previous message with stored media, fetch it
    let isReprocessing = false;
    let replyStorageId: string | null = null;
    if (originalRepliedMessageSid && !mediaUrl) {
      const stored = await ctx.runQuery(
        internal.mediaStorage.getMediaBySid,
        { messageSid: originalRepliedMessageSid }
      );
      if (stored) {
        replyStorageId = stored.storageId;
        if (isVoiceNote(stored.mediaType)) {
          // Use cached transcript — avoids re-calling Whisper API
          if (stored.transcript) {
            prompt = body
              ? `${body}\n\n[Voice note transcript: "${stored.transcript}"]`
              : `[Voice note transcript: "${stored.transcript}"]`;
          } else {
            // Fallback: transcript missing (pre-upgrade records), re-transcribe
            const voiceResult = await ctx.runAction(
              internal.voice.transcribeVoiceMessage,
              {
                mediaUrl: stored.storageUrl,
                mediaType: stored.mediaType,
                existingStorageId: stored.storageId,
              }
            );
            if (voiceResult) {
              prompt = body
                ? `${body}\n\n[Voice note transcript: "${voiceResult.transcript}"]`
                : `[Voice note transcript: "${voiceResult.transcript}"]`;
            } else {
              await ctx.runAction(internal.twilio.sendMessage, {
                to: user.phone,
                body: TEMPLATES.voice_transcription_failed.template,
              });
              return;
            }
          }
          // Don't set mediaUrl/mediaContentType — treat as text prompt
        } else {
          mediaUrl = stored.storageUrl;
          mediaContentType = stored.mediaType;
          isReprocessing = true;
        }
      }
    }
    if (mediaUrl && mediaContentType && isSupportedMediaType(mediaContentType)) {
      const result = await ctx.runAction(
        internal.documents.processMedia,
        {
          mediaUrl,
          mediaType: mediaContentType,
          userPrompt: body || undefined,
          isReprocessing,
        }
      );

      if (!result) {
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: TEMPLATES.document_extraction_failed.template,
        });
        return;
      }

      const { extracted, storageId } = result;

      await ctx.scheduler.runAfter(0, internal.analytics.trackDocumentProcessed, {
        phone: user.phone,
        media_type: mediaContentType,
        has_rag: isRagIndexable(mediaContentType),
      });
      await ctx.scheduler.runAfter(0, internal.analytics.trackFeatureUsed, {
        phone: user.phone,
        feature: "document_processing",
        tier: user.tier,
      });

      // Store media file for future reply-to-media (first-time only, not voice notes)
      if (messageSid && storageId) {
        await ctx.runMutation(internal.mediaStorage.trackMediaFile, {
          userId: typedUserId,
          storageId,
          messageSid,
          mediaType: mediaContentType,
          expiresAt: Date.now() + MEDIA_RETENTION_MS,
        });
      }

      const effectiveStorageId = storageId ?? replyStorageId;
      const storageIdNote = effectiveStorageId ? `\n[File storageId: ${effectiveStorageId} — pass this to convertFile if user wants conversion]` : "";
      prompt = body
        ? `[User sent a file (${mediaContentType})]${storageIdNote}\nUser's question: "${body}"\n\nExtracted content:\n${extracted}`
        : `[User sent a file (${mediaContentType})]${storageIdNote}\n\nExtracted content:\n${extracted}`;

      // Only index documents in RAG (not images, audio, or video)
      if (isRagIndexable(mediaContentType) && !isReprocessing) {
        await ctx.scheduler.runAfter(0, internal.rag.indexDocument, {
          userId: userId,
          text: extracted,
          title: `${mediaContentType} — ${new Date().toISOString()}`,
        });
      }
    } else if (mediaUrl && mediaContentType) {
      // Unsupported media type
      prompt = `[User sent an unsupported file type: ${mediaContentType}]`;
    }

    // Get or create thread for this user
    const { threadId } = await ghaliAgent.createThread(ctx, {
      userId,
    });

    // Generate response
    let responseText: string | undefined;
    let imageResult: { imageUrl: string; caption: string } | null = null;
    let convertedResult: { fileUrl: string; caption: string; outputFormat: string } | null = null;
    let aiSucceeded = false;
    let toolsUsed: string[] = [];
    try {
      const result = await ghaliAgent.generateText(
        ctx,
        { threadId },
        {
          prompt: userContext
            ? `${userContext}\n\n---\n<user_message>\n${prompt}\n</user_message>`
            : prompt,
        }
      );
      responseText = result.text;
      aiSucceeded = true;

      // Extract tools used across all steps
      toolsUsed = [
        ...new Set(
          result.steps.flatMap((s: { toolCalls: Array<{ toolName: string }> }) =>
            s.toolCalls.map((tc: { toolName: string }) => tc.toolName)
          )
        ),
      ];

      // Check tool results for converted file output (before image — both are JSON with URLs)
      convertedResult = extractConvertedFileFromSteps(result.steps);

      // Check tool results directly for image generation output
      if (!convertedResult) {
        imageResult = extractImageFromSteps(result.steps);
      }
    } catch (error) {
      console.error("Agent generateText failed:", error);
      responseText = "Sorry, I ran into an issue processing your message. Please try again.";
    }

    // Only deduct credit after successful AI response
    if (aiSucceeded && creditCheck.status === "available") {
      await ctx.runMutation(internal.credits.deductCredit, {
        userId: typedUserId,
      });
      const newCredits = Math.max(0, user.credits - 1);
      await ctx.scheduler.runAfter(0, internal.analytics.trackCreditUsed, {
        phone: user.phone,
        credits_remaining: newCredits,
        tier: user.tier,
        model: toolsUsed.includes("deepReasoning")
          ? MODELS.DEEP_REASONING
          : toolsUsed.includes("generateImage")
            ? MODELS.IMAGE_GENERATION
            : MODELS.FLASH,
        tools_used: toolsUsed.length > 0 ? toolsUsed : undefined,
      });

      // Low-credit warning — fires once when balance crosses below the threshold.
      // User just messaged so we're within the 24h session window — use normal message.
      if (
        newCredits <= CREDITS_LOW_THRESHOLD &&
        user.credits > CREDITS_LOW_THRESHOLD
      ) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendMessage, {
          to: user.phone,
          body: `You have ${newCredits} credits remaining this month. Need more? Send "upgrade" to learn about Pro.`,
        });
      }
    }

    if (convertedResult) {
      // Send converted file as WhatsApp media
      try {
        await ctx.runAction(internal.twilio.sendMedia, {
          to: user.phone,
          caption: convertedResult.caption,
          mediaUrl: convertedResult.fileUrl,
        });
      } catch (error) {
        console.error("sendMedia (conversion) failed, falling back to text:", error);
        await ctx.runAction(internal.twilio.sendMessage, {
          to: user.phone,
          body: convertedResult.caption,
        });
      }
    } else if (imageResult) {
      // Image analytics tracked in images.ts (with latency + model detail)
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
