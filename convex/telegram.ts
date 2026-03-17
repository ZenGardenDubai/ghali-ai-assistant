/**
 * Telegram Bot API Convex actions.
 * Mirrors the structure of whatsapp.ts but for Telegram.
 */
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramDocument,
  sendTelegramAudio,
  sendTelegramVideo,
  sendChatAction,
  downloadTelegramFileByPath,
  getTelegramFile as getTelegramFileInfo,
  editMessageText,
  sendInlineKeyboard,
  answerCallbackQuery as answerCbQuery,
} from "./lib/telegramSend";
import { formatForTelegram } from "./lib/telegram";

/** Mini App upgrade URL — configurable via env for dev/prod */
export function getUpgradeUrl(): string {
  return `${process.env.WEBAPP_BASE_URL ?? "https://ghali.ae"}/tg/upgrade`;
}

/** Mini App feedback URL — configurable via env for dev/prod */
export function getFeedbackUrl(): string {
  return `${process.env.WEBAPP_BASE_URL ?? "https://ghali.ae"}/tg/feedback`;
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN environment variable");
  }
  return token;
}

function getSendOptions(chatId: string) {
  return { botToken: getBotToken(), chatId };
}

export const sendMessage = internalAction({
  args: {
    chatId: v.string(),
    body: v.string(),
  },
  handler: async (_ctx, { chatId, body }) => {
    const messageId = await sendTelegramMessage(getSendOptions(chatId), body);
    return messageId;
  },
});

export const sendMedia = internalAction({
  args: {
    chatId: v.string(),
    caption: v.string(),
    mediaUrl: v.string(),
    mediaType: v.optional(
      v.union(
        v.literal("image"),
        v.literal("document"),
        v.literal("audio"),
        v.literal("video")
      )
    ),
  },
  handler: async (_ctx, { chatId, caption, mediaUrl, mediaType }) => {
    const opts = getSendOptions(chatId);
    const type = mediaType ?? "image";
    switch (type) {
      case "document":
        return await sendTelegramDocument(opts, mediaUrl, caption);
      case "audio":
        return await sendTelegramAudio(opts, mediaUrl, caption);
      case "video":
        return await sendTelegramVideo(opts, mediaUrl, caption);
      case "image":
      default:
        return await sendTelegramPhoto(opts, mediaUrl, caption);
    }
  },
});

/**
 * Download media from Telegram by file_id.
 * Stores directly in Convex file storage (avoids base64 round-trip).
 * Returns storageId and mimeType, or null on failure.
 *
 * Note: Telegram Bot API limits file downloads to 20MB.
 */
export const fetchMedia = internalAction({
  args: {
    fileId: v.string(),
  },
  handler: async (ctx, { fileId }) => {
    const botToken = getBotToken();

    // Get file info first (checks size, gets path for download)
    const fileInfo = await getTelegramFileInfo(botToken, fileId);
    if (!fileInfo) return null;
    if (fileInfo.fileSize && fileInfo.fileSize > 20 * 1024 * 1024) {
      console.warn(`[telegram] File too large: ${fileInfo.fileSize} bytes (max 20MB)`);
      return { error: "file_too_large", fileSize: fileInfo.fileSize };
    }

    // Download using filePath from above — avoids redundant getFile API call
    const result = await downloadTelegramFileByPath(botToken, fileInfo.filePath);
    if (!result) return null;

    // Store directly in Convex file storage
    const blob = new Blob([result.data], { type: result.mimeType });
    const storageId = await ctx.storage.store(blob);

    return { storageId, mimeType: result.mimeType };
  },
});

/**
 * Send a typing indicator (chat action).
 */
export const sendTypingIndicator = internalAction({
  args: {
    chatId: v.string(),
    action: v.optional(v.string()),
  },
  handler: async (_ctx, { chatId, action }) => {
    await sendChatAction(getSendOptions(chatId), action ?? "typing");
  },
});

/**
 * Edit a previously sent message (for streaming/typewriter effect).
 */
export const editMessage = internalAction({
  args: {
    chatId: v.string(),
    messageId: v.number(),
    text: v.string(),
  },
  handler: async (_ctx, { chatId, messageId, text }) => {
    await editMessageText(getSendOptions(chatId), messageId, text);
  },
});

/**
 * Send a message with an inline keyboard.
 */
export const sendKeyboard = internalAction({
  args: {
    chatId: v.string(),
    text: v.string(),
    keyboard: v.array(
      v.array(
        v.object({
          text: v.string(),
          url: v.optional(v.string()),
          callback_data: v.optional(v.string()),
          web_app: v.optional(v.object({ url: v.string() })),
        })
      )
    ),
  },
  handler: async (_ctx, { chatId, text, keyboard }) => {
    return await sendInlineKeyboard(getSendOptions(chatId), formatForTelegram(text), keyboard);
  },
});

/**
 * Answer a callback query (acknowledge inline button tap).
 */
export const answerCallbackQuery = internalAction({
  args: {
    callbackQueryId: v.string(),
    text: v.optional(v.string()),
    showAlert: v.optional(v.boolean()),
  },
  handler: async (_ctx, { callbackQueryId, text, showAlert }) => {
    await answerCbQuery(getBotToken(), callbackQueryId, text, showAlert ?? false);
  },
});

/**
 * Send welcome message to new Telegram users (non-blocking).
 * Tries to send the onboarding infographic, falls back to text.
 */
export const sendWelcome = internalAction({
  args: { chatId: v.string() },
  handler: async (ctx, { chatId }) => {
    const opts = getSendOptions(chatId);
    try {
      const onboardingConfig = await ctx.runQuery(
        internal.appConfig.getConfig,
        { key: "onboarding_image" }
      );
      if (onboardingConfig) {
        let parsed: { enabled?: boolean; url?: string } | null = null;
        try { parsed = JSON.parse(onboardingConfig.value); } catch { /* skip */ }
        if (parsed?.enabled === true && typeof parsed.url === "string" && parsed.url.length > 0) {
          await sendTelegramPhoto(opts, parsed.url, "Welcome to Ghali! 🤖");
          // Send keyboard as follow-up so new users see interactive buttons
          await sendInlineKeyboard(opts,
            "How can I help you today?",
            [
              [
                { text: "❓ Help", callback_data: "cmd:help" },
                { text: "⭐ Upgrade", web_app: { url: getUpgradeUrl() } },
              ],
            ]
          );
          return;
        }
      }
    } catch (error) {
      console.error("[telegram] Failed to send welcome image:", error);
    }
    // Send welcome with inline keyboard
    await sendInlineKeyboard(opts,
      "Welcome to Ghali! 🤖 I'm your AI assistant. How can I help you today?",
      [
        [
          { text: "❓ Help", callback_data: "cmd:help" },
          { text: "⭐ Upgrade", web_app: { url: getUpgradeUrl() } },
        ],
      ]
    );
  },
});

/**
 * Guarded send with inline keyboard: checks opt-out + outbound rate limit before sending.
 * Used for low-credit warnings, upgrade prompts, etc.
 */
export const guardedSendKeyboard = internalAction({
  args: {
    userId: v.id("users"),
    chatId: v.string(),
    body: v.string(),
    keyboard: v.array(
      v.array(
        v.object({
          text: v.string(),
          url: v.optional(v.string()),
          callback_data: v.optional(v.string()),
          web_app: v.optional(v.object({ url: v.string() })),
        })
      )
    ),
  },
  handler: async (ctx, { userId, chatId, body, keyboard }) => {
    const user = await ctx.runQuery(internal.users.internalGetUser, { userId });
    if (!user || user.optedOut || user.blocked) return;

    const guard = await ctx.runMutation(
      internal.outboundGuard.checkAndRecordOutbound,
      { userId }
    );
    if (!guard.allowed) {
      console.warn(`[outbound-guard] Blocked Telegram keyboard send to ${userId}: ${guard.reason}`);
      return;
    }
    try {
      await sendInlineKeyboard(getSendOptions(chatId), formatForTelegram(body), keyboard);
    } catch (error) {
      await ctx.runMutation(internal.outboundGuard.rollbackOutbound, { userId });
      console.error(`[telegram] guardedSendKeyboard failed for ${userId}:`, error);
    }
  },
});

/**
 * Guarded send: checks opt-out + outbound rate limit before sending.
 * Used by background senders (billing, credits, heartbeat, reminders).
 */
export const guardedSendMessage = internalAction({
  args: {
    userId: v.id("users"),
    chatId: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { userId, chatId, body }) => {
    // Re-check opt-out/blocked
    const user = await ctx.runQuery(internal.users.internalGetUser, { userId });
    if (!user || user.optedOut || user.blocked) return;

    const guard = await ctx.runMutation(
      internal.outboundGuard.checkAndRecordOutbound,
      { userId }
    );
    if (!guard.allowed) {
      console.warn(
        `[outbound-guard] Blocked Telegram send to ${userId}: ${guard.reason}`
      );
      return;
    }
    try {
      await sendTelegramMessage(getSendOptions(chatId), body);
    } catch (error) {
      await ctx.runMutation(internal.outboundGuard.rollbackOutbound, { userId });
      console.error(`[telegram] guardedSendMessage failed for ${userId}:`, error);
    }
  },
});
