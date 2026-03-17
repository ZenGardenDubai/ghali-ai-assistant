import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ghaliAgent, getOrCreateChatThread, setTraceId, clearTraceId } from "./agent";
import { MODELS } from "./models";
import { getCurrentDateTime, fillTemplate, classifyCommand, isSystemCommand, isAdminCommand, isAffirmative, buildReplyToTextPrompt } from "./lib/utils";
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
import { CREDITS_BASIC, CREDITS_PRO, CREDITS_LOW_THRESHOLD, MEDIA_RETENTION_MS, SESSION_GAP_MS } from "./constants";
import { getRecapInstruction } from "./lib/engagementRecap";
import { isNewSession } from "./lib/analytics";
import { needsTermsAcceptance } from "./lib/termsGating";

/**
 * Try to parse a generateImage tool result (JSON with imageUrl + caption + optional storageId).
 * Returns the URL, caption, and optional storageId, or null if not an image result.
 */
export function parseImageToolResult(
  text: string
): { imageUrl: string; caption: string; storageId?: string } | null {
  try {
    const parsed = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      parsed.type === "image" &&
      typeof parsed.imageUrl === "string" &&
      typeof parsed.caption === "string"
    ) {
      const result: { imageUrl: string; caption: string; storageId?: string } = {
        imageUrl: parsed.imageUrl,
        caption: parsed.caption,
      };
      if (typeof parsed.storageId === "string") {
        result.storageId = parsed.storageId;
      }
      return result;
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
 * Map a convertFile output format to the WhatsApp Cloud API media type.
 * Convex storage URLs have no file extension, so we can't infer from URL.
 */
export function convertedFormatToWhatsAppType(
  outputFormat: string
): "image" | "document" | "audio" | "video" {
  const fmt = outputFormat.toLowerCase();
  if (["png", "jpg", "jpeg", "webp"].includes(fmt)) return "image";
  if (["mp3", "wav", "ogg", "aac", "flac"].includes(fmt)) return "audio";
  if (["mp4", "webm", "3gpp", "mov"].includes(fmt)) return "video";
  return "document";
}

/**
 * Extract the string value from a tool result, handling both formats:
 * - Legacy (AI SDK v5 / older @convex-dev/agent): `result` is a plain string
 * - Current (@convex-dev/agent 0.3.x): `output` is `{ type: "text", value: "..." }`
 */
export function extractToolResultText(
  toolResult: Record<string, unknown>
): string | null {
  // New format: output is { type: "text"|"json"|..., value: ... }
  const output = toolResult.output;
  if (output && typeof output === "object" && "value" in output) {
    const typed = output as { type: string; value: unknown };
    if (typeof typed.value === "string") return typed.value;
    // For JSON output type, stringify the value
    if (typed.value !== null && typed.value !== undefined) {
      return JSON.stringify(typed.value);
    }
  }
  // Legacy format: output or result is a plain string
  if (typeof output === "string") return output;
  if (typeof toolResult.result === "string") return toolResult.result;
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
      const text = extractToolResultText(toolResult);
      if (text) {
        const match = parseConvertedFileResult(text);
        if (match) return match;
      }
    }
  }
  return null;
}

/**
 * Scan all tool results from generateText steps for an image generation result.
 * The generateImage tool returns JSON: { imageUrl, caption, storageId? }.
 * We check tool results directly since Flash may not relay the URL in its text.
 */
export function extractImageFromSteps(
  steps: Array<{ toolResults: Array<Record<string, unknown>> }>
): { imageUrl: string; caption: string; storageId?: string } | null {
  for (const step of steps) {
    for (const toolResult of step.toolResults) {
      const text = extractToolResultText(toolResult);
      if (text) {
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
    channel: v.optional(v.union(v.literal("whatsapp"), v.literal("telegram"))),
    chatId: v.optional(v.string()),
    mediaStorageId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, body, mediaUrl, mediaContentType, messageSid, originalRepliedMessageSid, channel, chatId, mediaStorageId }
  ) => {
    // Capture previous lastMessageAt before updating — needed for session detection
    const user = await ctx.db.get(userId);
    const previousLastMessageAt = user?.lastMessageAt;

    // Reactivate blocked users on inbound message
    const reactivateFields: Record<string, unknown> = { lastMessageAt: Date.now() };
    if (user?.blocked) reactivateFields.blocked = false;
    await ctx.db.patch(userId, reactivateFields);

    // Schedule async response generation
    await ctx.scheduler.runAfter(0, internal.messages.generateResponse, {
      userId: userId as string,
      body,
      mediaUrl,
      mediaContentType,
      messageSid,
      originalRepliedMessageSid,
      previousLastMessageAt,
      channel,
      chatId,
      mediaStorageId,
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
    previousLastMessageAt: v.optional(v.number()),
    channel: v.optional(v.union(v.literal("whatsapp"), v.literal("telegram"))),
    chatId: v.optional(v.string()),
    mediaStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, messageSid, originalRepliedMessageSid, previousLastMessageAt, channel, chatId } = args;
    let { body, mediaUrl, mediaContentType } = args;
    const typedUserId = userId as Id<"users">;
    const isTelegram = channel === "telegram";

    // ── Single response guarantee ──────────────────────────────────────
    // Ensures at most ONE outbound message (or message group) per invocation.
    // Every send path must go through guardedSend() instead of calling
    // internal.whatsapp.sendMessage / sendMedia directly.
    let responseSent = false;

    /**
     * Send a text message to the user, guarded against double-sends.
     * Returns true if sent, false if blocked (already sent this invocation).
     */
    /** Inline keyboard button type for Telegram. Ignored for WhatsApp. */
    type InlineButton = { text: string; url?: string; callback_data?: string; web_app?: { url: string } };

    async function guardedSendMessage(
      msgBody: string,
      keyboard?: InlineButton[][]
    ): Promise<boolean> {
      if (responseSent) {
        console.warn(
          `[single-response-guard] Blocked duplicate send to ${userId} ` +
            `(messageSid: ${messageSid})`
        );
        return false;
      }
      // Outbound rate guard — check DB-backed per-user rate limit
      const guard = await ctx.runMutation(
        internal.outboundGuard.checkAndRecordOutbound,
        { userId: typedUserId }
      );
      if (!guard.allowed) {
        console.warn(
          `[outbound-guard] Blocked send to ${userId}: ${guard.reason}`
        );
        return false;
      }
      responseSent = true;
      if (isTelegram && chatId) {
        if (keyboard && keyboard.length > 0) {
          await ctx.runAction(internal.telegram.sendKeyboard, {
            chatId,
            text: msgBody,
            keyboard,
          });
        } else {
          await ctx.runAction(internal.telegram.sendMessage, {
            chatId,
            body: msgBody,
          });
        }
      } else {
        await ctx.runAction(internal.whatsapp.sendMessage, {
          to: user!.phone,
          body: msgBody,
        });
      }
      return true;
    }

    /**
     * Send a media message to the user, guarded against double-sends.
     * Falls back to text-only on send error.
     * Returns { sent, messageId? } where messageId is the Telegram message_id (if applicable).
     */
    async function guardedSendMedia(
      caption: string,
      mediaUrlToSend: string,
      mediaType?: "image" | "document" | "audio" | "video"
    ): Promise<{ sent: boolean; messageId?: number }> {
      if (responseSent) {
        console.warn(
          `[single-response-guard] Blocked duplicate media send to ${userId}`
        );
        return { sent: false };
      }
      const guard = await ctx.runMutation(
        internal.outboundGuard.checkAndRecordOutbound,
        { userId: typedUserId }
      );
      if (!guard.allowed) {
        console.warn(
          `[outbound-guard] Blocked media send to ${userId}: ${guard.reason}`
        );
        return { sent: false };
      }
      responseSent = true;
      try {
        if (isTelegram && chatId) {
          const messageId = await ctx.runAction(internal.telegram.sendMedia, {
            chatId,
            caption,
            mediaUrl: mediaUrlToSend,
            mediaType,
          });
          return { sent: true, messageId };
        } else {
          await ctx.runAction(internal.whatsapp.sendMedia, {
            to: user!.phone,
            caption,
            mediaUrl: mediaUrlToSend,
            mediaType,
          });
          return { sent: true };
        }
      } catch (error) {
        console.error(
          `[guardedSendMedia] sendMedia failed for ${userId}, falling back to text. ` +
            `Note: if original was partially sent, user may receive duplicate.`,
          error
        );
        if (isTelegram && chatId) {
          await ctx.runAction(internal.telegram.sendMessage, {
            chatId,
            body: caption,
          });
        } else {
          await ctx.runAction(internal.whatsapp.sendMessage, {
            to: user!.phone,
            body: caption,
          });
        }
        return { sent: true };
      }
    }

    // `user` is set below after the initial query — referenced by guard helpers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user: any = null;

    // Get user info
    user = await ctx.runQuery(internal.users.internalGetUser, {
      userId: typedUserId,
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    // Circuit breaker: if the user hit repeated API errors, back off silently
    // until the backoff window expires. Prevents response loops during outages.
    if (user.errorBackoffUntil && Date.now() < user.errorBackoffUntil) {
      console.log(
        `[circuit-breaker] User ${userId} in error backoff until ` +
          `${new Date(user.errorBackoffUntil).toISOString()}, skipping`
      );
      return;
    }

    // Terms acceptance gate — WhatsApp-only flow (Telegram auto-accepts at creation):
    // First message → send infographic + caption, return early
    // Second message → auto-accept terms, fall through to normal processing
    if (!isTelegram && needsTermsAcceptance(user)) {
      // Branch A: user already received the terms prompt → auto-accept on this message
      if (user.termsPromptSentAt) {
        const acceptance = await ctx.runMutation(
          internal.billing.recordTermsAcceptance,
          { userId: typedUserId }
        );
        if (acceptance.accepted) {
          await ctx.scheduler.runAfter(0, internal.analytics.trackTermsAccepted, {
            phone: user.phone,
            tier: user.tier,
          });
        }
        // Fall through — process the message normally
      } else {
        // Branch B: first message ever → send terms prompt, return early
        const termsGuard = await ctx.runMutation(
          internal.outboundGuard.checkAndRecordTermsPrompt,
          { userId: typedUserId }
        );
        if (termsGuard.allowed) {
          const isOnboardingUser = user.onboardingStep != null;
          const caption = TEMPLATES.terms_prompt.template;

          // Try to send infographic with caption; fall back to plain text
          const onboardingConfig = await ctx.runQuery(internal.appConfig.getConfig, { key: "onboarding_image" });
          let imageSent = false;
          if (onboardingConfig) {
            let parsed: { enabled?: boolean; url?: string } | null = null;
            try { parsed = JSON.parse(onboardingConfig.value); } catch { /* skip */ }
            if (parsed?.enabled === true && typeof parsed.url === "string" && parsed.url.length > 0) {
              try {
                await ctx.runAction(internal.whatsapp.sendMedia, {
                  to: user.phone,
                  caption,
                  mediaUrl: parsed.url,
                });
                imageSent = true;
              } catch (error) {
                console.error("Failed to send terms infographic:", error);
              }
            }
          }

          if (!imageSent) {
            await ctx.runAction(internal.whatsapp.sendMessage, {
              to: user.phone,
              body: caption,
            });
          }

          // Track terms prompt sent (fire-and-forget)
          await ctx.scheduler.runAfter(0, internal.analytics.trackTermsPromptSent, {
            phone: user.phone,
            user_type: isOnboardingUser ? "new" as const : "existing" as const,
          });
        }
        // Return early — block first message from processing
        return;
      }
    }

    // Track session-start for returning users (fire-and-forget).
    // user_returning fires only when the gap since their last message exceeds SESSION_GAP_MS.
    // trackUserNew was moved to findOrCreateUser so new users appear in PostHog at creation time.
    const isNewUser = user.onboardingStep === 1;
    const sessionStarted = isNewSession(previousLastMessageAt, Date.now(), SESSION_GAP_MS);
    if (!isNewUser && sessionStarted) {
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
        if (result.response) {
          const translatedResponse = await translateMessage(result.response, lang);
          await guardedSendMessage(translatedResponse);
        }
        // Re-send welcome keyboard when Telegram user returns to step 1 (e.g. after city input)
        if (isTelegram && chatId && result.nextStep === 1) {
          const updatedTz = result.updates?.timezone ?? user.timezone;
          const updatedLang = result.updates?.language ?? user.language ?? "en";
          await ctx.runAction(internal.telegram.sendWelcome, {
            chatId,
            name: user.name,
            timezone: updatedTz,
            language: updatedLang,
          });
        }
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
        const pendingAction = user.pendingAction as "admin_broadcast" | "clear_memory" | "clear_documents" | "clear_schedules" | "clear_everything" | "delete_account";

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
          await guardedSendMessage(doneMessage);
          return;
        }

        // Clear data confirmations
        if (
          pendingAction === "clear_memory" ||
          pendingAction === "clear_documents" ||
          pendingAction === "clear_schedules" ||
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
            clear_schedules: internal.dataManagement.clearSchedules,
            clear_everything: internal.dataManagement.clearEverything,
          } as const;
          await ctx.runAction(clearActionMap[pendingAction], { userId: typedUserId });

          // Send the "done" template
          const doneTemplateMap = {
            clear_memory: "clear_memory_done",
            clear_documents: "clear_documents_done",
            clear_schedules: "clear_schedules_done",
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
          await guardedSendMessage(doneMessage);
          return;
        }

        // Account deletion confirmation — send farewell, then delete everything
        if (pendingAction === "delete_account") {
          await ctx.runMutation(internal.users.clearPendingAction, {
            userId: typedUserId,
          });
          const farewellMsg = await renderSystemMessage("delete_account_done", {}, body);
          await guardedSendMessage(farewellMsg);
          await ctx.runAction(internal.accountControl.deleteAccount, {
            userId: typedUserId,
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
        // Set pending action if this is a confirmation command (clear, delete)
        if (systemResult.pendingAction) {
          await ctx.runMutation(internal.users.setPendingAction, {
            userId: typedUserId,
            action: systemResult.pendingAction,
          });
        }

        // Handle immediate actions (opt-out/opt-in)
        if (systemResult.immediateAction) {
          if (systemResult.immediateAction === "opt_out") {
            await ctx.runMutation(internal.accountControl.triggerOptOut, { userId: typedUserId });
            await ctx.scheduler.runAfter(0, internal.analytics.trackUserOptedOut, {
              phone: user.phone,
              tier: user.tier,
            });
          } else if (systemResult.immediateAction === "opt_in") {
            await ctx.runMutation(internal.accountControl.triggerOptIn, { userId: typedUserId });
            await ctx.scheduler.runAfter(0, internal.analytics.trackUserOptedIn, {
              phone: user.phone,
              tier: user.tier,
            });
          }
        }

        await ctx.scheduler.runAfter(0, internal.analytics.trackSystemCommand, {
          phone: user.phone,
          command: messageForCredits,
        });

        // Add inline keyboard for Telegram system commands
        let systemKeyboard: InlineButton[][] | undefined;
        if (isTelegram) {
          const cmd = messageForCredits.toLowerCase().trim();
          if (cmd === "help" || cmd === "commands") {
            const baseUrl = process.env.WEBAPP_BASE_URL ?? "https://ghali.ae";
            systemKeyboard = [
              [{ text: "👤 Manage Your Account", url: `${baseUrl}/account` }],
              [
                { text: "📝 Send Feedback", web_app: { url: `${baseUrl}/tg/feedback` } },
                { text: "⭐ Upgrade to Pro", web_app: { url: `${baseUrl}/tg/upgrade` } },
              ],
            ];
          } else if (cmd === "feedback") {
            systemKeyboard = [
              [{ text: "📝 Send Feedback", web_app: { url: `${process.env.WEBAPP_BASE_URL ?? "https://ghali.ae"}/tg/feedback` } }],
            ];
          } else if (cmd === "credits" || cmd === "account") {
            const baseUrl = process.env.WEBAPP_BASE_URL ?? "https://ghali.ae";
            systemKeyboard = [
              [{ text: "👤 Manage Your Account", url: `${baseUrl}/account` }],
              [
                { text: "📝 Send Feedback", web_app: { url: `${baseUrl}/tg/feedback` } },
                { text: "⭐ Upgrade to Pro", web_app: { url: `${baseUrl}/tg/upgrade` } },
              ],
            ];
          }
        }

        await guardedSendMessage(systemResult.response, systemKeyboard);
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
        await guardedSendMessage(adminResult.response);
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
      await guardedSendMessage(message, isTelegram ? [
        [{ text: "⭐ Upgrade to Pro", web_app: { url: `${process.env.WEBAPP_BASE_URL ?? "https://ghali.ae"}/tg/upgrade` } }],
      ] : undefined);
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
      await guardedSendMessage(message);
      return;
    }



    // Build user context from per-user files + datetime
    const { date, time, tz } = getCurrentDateTime(user.timezone);
    const userContext = buildUserContext(
      userFiles,
      { date, time, tz },
      { language: user.language, timezone: user.timezone, optedOut: !!user.optedOut }
    );

    // Telegram media — either pre-uploaded by bot server (>20MB) or downloaded via Bot API (<20MB)
    let telegramStorageId: Id<"_storage"> | null = null;
    if (isTelegram && args.mediaStorageId && mediaContentType) {
      // Bot server already uploaded the file to Convex storage (large file path)
      telegramStorageId = args.mediaStorageId as Id<"_storage">;
      const storageUrl = await ctx.storage.getUrl(telegramStorageId);
      if (storageUrl) {
        mediaUrl = storageUrl;
      } else {
        console.error("[generateResponse] Pre-uploaded storage ID invalid:", args.mediaStorageId);
        mediaUrl = undefined;
        mediaContentType = undefined;
        telegramStorageId = null;
      }
    } else if (isTelegram && mediaUrl && mediaContentType) {
      // Small file — download via Bot API (fetchMedia stores in Convex, returns storageId)
      const telegramMedia = await ctx.runAction(internal.telegram.fetchMedia, {
        fileId: mediaUrl,
      });
      if (telegramMedia && "error" in telegramMedia) {
        // File too large (>20MB Bot API limit) — shouldn't happen if bot server handles large files
        await guardedSendMessage(
          "Sorry, that file is too large for me to process. Please try a smaller file."
        );
        return;
      } else if (telegramMedia && "storageId" in telegramMedia) {
        telegramStorageId = telegramMedia.storageId as Id<"_storage">;
        const storageUrl = await ctx.storage.getUrl(telegramStorageId);
        if (storageUrl) {
          mediaUrl = storageUrl;
          if (mediaContentType === "application/octet-stream") {
            mediaContentType = telegramMedia.mimeType;
          }
        } else {
          console.error("[generateResponse] Failed to get storage URL for Telegram media");
          mediaUrl = undefined;
          mediaContentType = undefined;
        }
      } else {
        console.error("[generateResponse] Failed to download Telegram media");
        mediaUrl = undefined;
        mediaContentType = undefined;
      }
    }

    // Voice note intercept — transcribe and use as text prompt
    // WhatsApp voice notes (audio/ogg) are treated as spoken input, not files.
    // Other audio formats (mp3, m4a, etc.) are treated as files for Gemini analysis.
    if (mediaUrl && mediaContentType && isVoiceNote(mediaContentType)) {
      const voiceResult = await ctx.runAction(
        internal.voice.transcribeVoiceMessage,
        {
          mediaUrl,
          mediaType: mediaContentType,
          // For Telegram: media is already in Convex storage, pass storageId to skip 360dialog download
          ...(telegramStorageId ? { existingStorageId: telegramStorageId } : {}),
        }
      );

      if (!voiceResult) {
        await guardedSendMessage(TEMPLATES.voice_transcription_failed.template);
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
              await guardedSendMessage(TEMPLATES.voice_transcription_failed.template);
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

      // Reply-to-text: Cloud API doesn't expose quoted message text.
      // TODO: Store outbound message wamids locally to enable reply-context lookup.
      // For now, reply-to-text context is not available with 360dialog.

      // Fallback: check if this is a reply to a Ghali-generated image.
      // Generated images are tracked in the generatedImages table with messageSid
      // set after the image is sent to Telegram.
      if (!replyStorageId) {
        const generatedImage = await ctx.runQuery(
          internal.imageStorage.getGeneratedImageBySid,
          { messageSid: originalRepliedMessageSid, userId: typedUserId }
        );
        if (generatedImage) {
          replyStorageId = generatedImage.storageId;
          mediaUrl = generatedImage.storageUrl;
          mediaContentType = generatedImage.mediaType;
          isReprocessing = true;
        }
      }
    }
    if (mediaUrl && mediaContentType && isSupportedMediaType(mediaContentType)) {
      let result: { extracted: string; storageId: Id<"_storage"> | null } | null = null;
      try {
        result = await ctx.runAction(
          internal.documents.processMedia,
          {
            mediaUrl,
            mediaType: mediaContentType,
            userPrompt: body || undefined,
            isReprocessing: isReprocessing || (isTelegram && telegramStorageId != null),
          }
        );
      } catch (error) {
        console.error(
          `[Messages] processMedia failed for ${mediaContentType}:`,
          error instanceof Error ? error.message : String(error)
        );
      }

      if (!result) {
        await guardedSendMessage(TEMPLATES.document_extraction_failed.template);
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
      // For Telegram: processMedia returns storageId=null (isReprocessing=true),
      // so fall back to telegramStorageId which was set during the download step.
      const mediaStorageId = storageId ?? telegramStorageId;
      if (messageSid && mediaStorageId) {
        await ctx.runMutation(internal.mediaStorage.trackMediaFile, {
          userId: typedUserId,
          storageId: mediaStorageId,
          messageSid,
          mediaType: mediaContentType,
          expiresAt: Date.now() + MEDIA_RETENTION_MS,
        });
      }

      const effectiveStorageId = mediaStorageId ?? replyStorageId;
      const isImage = mediaContentType.startsWith("image/");
      const storageIdNote = effectiveStorageId
        ? `\n[File storageId: ${effectiveStorageId} — pass this to convertFile if user wants conversion${isImage ? ", or to generateImage as referenceImageStorageId if user wants to edit/modify this image" : ""}]`
        : "";
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

    // Get the user's existing chat thread, or create one on first message.
    // Using getOrCreateChatThread instead of createThread directly, because
    // createThread always inserts a new thread and would lose all history.
    const threadId = await getOrCreateChatThread(ctx, userId);

    // Set per-request trace ID for PostHog LLM analytics
    setTraceId(crypto.randomUUID());

    // Engagement recap: check if we should weave an insight into this response
    const recapContext = getRecapInstruction({ credits: user.credits, tier: user.tier, totalMessages: user.totalMessages });

    // Generate response
    // Refresh typing indicator every 4s during AI generation (each indicator lasts ~5s)
    let typingInterval: ReturnType<typeof setInterval> | null = null;
    if (isTelegram && chatId) {
      typingInterval = setInterval(() => {
        ctx.runAction(internal.telegram.sendTypingIndicator, {
          chatId: chatId!,
        }).catch(() => {}); // best-effort
      }, 4000);
    }

    let responseText: string | undefined;
    let imageResult: { imageUrl: string; caption: string; storageId?: string } | null = null;
    let convertedResult: { fileUrl: string; caption: string; outputFormat: string } | null = null;
    let aiSucceeded = false;
    let toolsUsed: string[] = [];
    try {
      const result = await ghaliAgent.generateText(
        ctx,
        { threadId },
        {
          prompt: userContext
            ? `${userContext}${recapContext ? "\n\n" + recapContext : ""}\n\n---\n<user_message>\n${prompt}\n</user_message>`
            : `${recapContext ? recapContext + "\n\n" : ""}${prompt}`,
        }
      );
      responseText = result.text;
      aiSucceeded = true;
      // Reset the circuit breaker on a successful response
      await ctx.runMutation(internal.users.resetApiErrors, { userId: typedUserId });

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
      // Record the error — increments consecutive error count and trips circuit
      // breaker (sets errorBackoffUntil) once the threshold is reached.
      const errorState = await ctx.runMutation(internal.users.recordApiError, {
        userId: typedUserId,
      });
      // Only send ONE error notification per error sequence (on the first failure).
      // For the 2nd+ consecutive failures, go silent — sending any message risks
      // re-triggering the loop if outbound messages echo back through the webhook.
      if (errorState.consecutiveErrors === 1) {
        responseText = "Sorry, I ran into an issue processing your message. Please try again.";
      } else {
        // Silent failure — short-circuit to avoid unnecessary work downstream
        return;
      }
    } finally {
      if (typingInterval) clearInterval(typingInterval);
      clearTraceId();
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
      // Track message volume separately from session tracking
      await ctx.scheduler.runAfter(0, internal.analytics.trackMessageSent, {
        phone: user.phone,
        tier: user.tier,
        is_new_session: sessionStarted,
      });

      // Increment reflection counter and trigger background reflection if threshold reached
      // Counter is reset atomically inside the mutation to prevent duplicate triggers
      const reflectionState = await ctx.runMutation(
        internal.reflection.incrementReflectionCounter,
        { userId: typedUserId }
      );
      if (reflectionState.shouldReflect) {
        await ctx.scheduler.runAfter(0, internal.reflection.runReflection, {
          userId: typedUserId,
          trigger: "counter",
          messagesReviewed: reflectionState.count,
        });
      }
    }

    // Send the primary reply first — this is what the user is waiting for
    if (convertedResult) {
      const waMediaType = convertedFormatToWhatsAppType(convertedResult.outputFormat);
      await guardedSendMedia(convertedResult.caption, convertedResult.fileUrl, waMediaType);
    } else if (imageResult) {
      const sendResult = await guardedSendMedia(imageResult.caption, imageResult.imageUrl, "image");
      // Associate the Telegram message_id with the generated image's storageId so that
      // future replies/quotes to this image can resolve the correct edit base.
      if (isTelegram && chatId && sendResult.messageId && imageResult.storageId) {
        await ctx.runMutation(internal.imageStorage.updateMessageSid, {
          storageId: imageResult.storageId as Id<"_storage">,
          userId: typedUserId,
          messageSid: `${chatId}:${sendResult.messageId}`,
        });
      }
    } else if (responseText) {
      // Attach web_app button for feedback Mini App when agent used generateFeedbackLink
      const feedbackKeyboard =
        isTelegram && chatId && toolsUsed.includes("generateFeedbackLink")
          ? [[{ text: "📝 Send Feedback", web_app: { url: `${process.env.WEBAPP_BASE_URL ?? "https://ghali.ae"}/tg/feedback` } }]]
          : undefined;
      await guardedSendMessage(responseText, feedbackKeyboard);
    }

    // Low-credit warning — fires AFTER the main reply so it can't pre-empt it.
    // Best-effort: scheduled follow-up so failures don't affect the user's response.
    if (
      aiSucceeded &&
      creditCheck.status === "available" &&
      (Math.max(0, user.credits - 1)) <= CREDITS_LOW_THRESHOLD &&
      user.credits > CREDITS_LOW_THRESHOLD
    ) {
      const lowCreditMsg = fillTemplate(
        TEMPLATES.credits_low_warning.template,
        { credits: Math.max(0, user.credits - 1) }
      );
      if (isTelegram && chatId) {
        ctx.scheduler.runAfter(2000, internal.telegram.guardedSendKeyboard, {
          userId: typedUserId,
          chatId,
          body: lowCreditMsg,
          keyboard: [[{ text: "⭐ Upgrade to Pro", web_app: { url: `${process.env.WEBAPP_BASE_URL ?? "https://ghali.ae"}/tg/upgrade` } }]],
        });
      } else {
        ctx.scheduler.runAfter(2000, internal.whatsapp.guardedSendMessage, {
          userId: typedUserId,
          to: user.phone,
          body: lowCreditMsg,
        });
      }
    }
  },
});
