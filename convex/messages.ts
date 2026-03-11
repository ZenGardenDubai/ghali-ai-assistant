import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ghaliAgent, setTraceId, clearTraceId } from "./agent";
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
import { isNewSession } from "./lib/analytics";

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
 * The generateImage tool returns JSON: { imageUrl, caption }.
 * We check tool results directly since Flash may not relay the URL in its text.
 */
export function extractImageFromSteps(
  steps: Array<{ toolResults: Array<Record<string, unknown>> }>
): { imageUrl: string; caption: string } | null {
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
  },
  handler: async (
    ctx,
    { userId, body, mediaUrl, mediaContentType, messageSid, originalRepliedMessageSid }
  ) => {
    // Capture previous lastMessageAt before updating — needed for session detection
    const user = await ctx.db.get(userId);
    const previousLastMessageAt = user?.lastMessageAt;

    // Reactivate dormant users on inbound message — they found the new number
    if (user?.dormant) {
      await ctx.db.patch(userId, { dormant: false, lastMessageAt: Date.now() });
    } else {
      // Track last message time for WhatsApp 24h session window
      await ctx.db.patch(userId, { lastMessageAt: Date.now() });
    }

    // Schedule async response generation
    await ctx.scheduler.runAfter(0, internal.messages.generateResponse, {
      userId: userId as string,
      body,
      mediaUrl,
      mediaContentType,
      messageSid,
      originalRepliedMessageSid,
      previousLastMessageAt,
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
  },
  handler: async (ctx, args) => {
    const { userId, messageSid, originalRepliedMessageSid, previousLastMessageAt } = args;
    let { body, mediaUrl, mediaContentType } = args;
    const typedUserId = userId as Id<"users">;

    // ── Single response guarantee ──────────────────────────────────────
    // Ensures at most ONE outbound message (or message group) per invocation.
    // Every send path must go through guardedSend() instead of calling
    // internal.whatsapp.sendMessage / sendMedia directly.
    let responseSent = false;

    /**
     * Send a text message to the user, guarded against double-sends.
     * Returns true if sent, false if blocked (already sent this invocation).
     */
    async function guardedSendMessage(msgBody: string): Promise<boolean> {
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
      await ctx.runAction(internal.whatsapp.sendMessage, {
        to: user!.phone,
        body: msgBody,
      });
      return true;
    }

    /**
     * Send a media message to the user, guarded against double-sends.
     * Falls back to text-only on send error.
     */
    async function guardedSendMedia(
      caption: string,
      mediaUrlToSend: string,
      mediaType?: "image" | "document" | "audio" | "video"
    ): Promise<boolean> {
      if (responseSent) {
        console.warn(
          `[single-response-guard] Blocked duplicate media send to ${userId}`
        );
        return false;
      }
      const guard = await ctx.runMutation(
        internal.outboundGuard.checkAndRecordOutbound,
        { userId: typedUserId }
      );
      if (!guard.allowed) {
        console.warn(
          `[outbound-guard] Blocked media send to ${userId}: ${guard.reason}`
        );
        return false;
      }
      responseSent = true;
      try {
        await ctx.runAction(internal.whatsapp.sendMedia, {
          to: user!.phone,
          caption,
          mediaUrl: mediaUrlToSend,
          mediaType,
        });
      } catch (error) {
        console.error(
          `[guardedSendMedia] sendMedia failed for ${userId}, falling back to text. ` +
            `Note: if original was partially sent, user may receive duplicate.`,
          error
        );
        await ctx.runAction(internal.whatsapp.sendMessage, {
          to: user!.phone,
          body: caption,
        });
      }
      return true;
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

    // Send onboarding infographic before step 1 welcome (if configured and enabled)
    let sentInfographic = false;
    if (user.onboardingStep === 1) {
      const onboardingConfig = await ctx.runQuery(internal.appConfig.getConfig, { key: "onboarding_image" });
      if (onboardingConfig) {
        let parsed: { enabled?: boolean; url?: string } | null = null;
        try {
          parsed = JSON.parse(onboardingConfig.value);
        } catch {
          // Invalid config JSON — skip silently
        }
        if (parsed?.enabled === true && typeof parsed.url === "string" && parsed.url.length > 0) {
          try {
            await ctx.runAction(internal.whatsapp.sendMedia, {
              to: user.phone,
              caption: "",
              mediaUrl: parsed.url,
            });
            sentInfographic = true;
          } catch (error) {
            console.error("Failed to send onboarding infographic:", error);
          }
        }
      }
    }

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
        // Brief delay so the infographic arrives before the welcome text
        if (sentInfographic) {
          await new Promise((r) => setTimeout(r, 2000));
        }
        await guardedSendMessage(translatedResponse);
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
        await guardedSendMessage(systemResult.response);
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
      await guardedSendMessage(message);
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

    // Voice note intercept — transcribe and use as text prompt
    // WhatsApp voice notes (audio/ogg) are treated as spoken input, not files.
    // Other audio formats (mp3, m4a, etc.) are treated as files for Gemini analysis.
    if (mediaUrl && mediaContentType && isVoiceNote(mediaContentType)) {
      const voiceResult = await ctx.runAction(
        internal.voice.transcribeVoiceMessage,
        { mediaUrl, mediaType: mediaContentType }
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
            isReprocessing,
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

    // Get or create thread for this user.
    // Thread scoping (one thread per userId) is enforced by @convex-dev/agent.
    // We pass userId explicitly so the library can scope the thread correctly.
    const { threadId } = await ghaliAgent.createThread(ctx, {
      userId,
    });

    // Set per-request trace ID for PostHog LLM analytics
    setTraceId(crypto.randomUUID());

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
        });
      }
    }

    // Send the primary reply first — this is what the user is waiting for
    if (convertedResult) {
      const waMediaType = convertedFormatToWhatsAppType(convertedResult.outputFormat);
      await guardedSendMedia(convertedResult.caption, convertedResult.fileUrl, waMediaType);
    } else if (imageResult) {
      await guardedSendMedia(imageResult.caption, imageResult.imageUrl, "image");
    } else if (responseText) {
      await guardedSendMessage(responseText);
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
      ctx.scheduler.runAfter(2000, internal.whatsapp.guardedSendMessage, {
        userId: typedUserId,
        to: user.phone,
        body: lowCreditMsg,
      });
    }
  },
});
