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
import { TEMPLATES } from "./templates";
import { formatTimezoneForDisplay } from "./lib/onboarding";
import { fillTemplate } from "./lib/utils";

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
    await editMessageText(getSendOptions(chatId), messageId, formatForTelegram(text));
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

/** Valid onboarding timezones (must match picker buttons) */
export const ONBOARDING_TIMEZONES = new Set([
  "Asia/Dubai", "Asia/Riyadh", "Europe/London", "Europe/Paris",
  "America/New_York", "Asia/Kolkata",
]);

/** Valid onboarding languages (must match picker buttons) */
export const ONBOARDING_LANGUAGES = new Set(["en", "ar", "fr", "hi"]);

/** Language display labels */
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
  hi: "हिन्दी",
};

/**
 * Build the onboarding welcome text for a Telegram user.
 */
function buildWelcomeText(name: string, timezone: string, language: string): string {
  const tzDisplay = formatTimezoneForDisplay(timezone);
  const langDisplay = LANGUAGE_LABELS[language] ?? language;
  return fillTemplate(TEMPLATES.telegram_welcome.template, {
    name: name || "there",
    timezone: tzDisplay,
    language: langDisplay,
  });
}

/** Onboarding inline keyboard */
const ONBOARDING_KEYBOARD = [
  [
    { text: "🌍 Change Timezone", callback_data: "ob:tz" },
    { text: "🌐 Change Language", callback_data: "ob:lang" },
  ],
  [{ text: "💬 Start Chatting", callback_data: "ob:done" }],
];

/**
 * Send welcome message to new Telegram users (non-blocking).
 * Tries to send the onboarding infographic, then the welcome text with onboarding buttons.
 */
export const sendWelcome = internalAction({
  args: { chatId: v.string(), name: v.optional(v.string()), timezone: v.optional(v.string()), language: v.optional(v.string()) },
  handler: async (_ctx, { chatId, name, timezone, language }) => {
    const opts = getSendOptions(chatId);
    const userName = name ?? "there";
    const tz = timezone ?? "Asia/Dubai";
    const lang = language ?? "en";

    // Send welcome text with onboarding keyboard
    const welcomeText = buildWelcomeText(userName, tz, lang);
    await sendInlineKeyboard(opts, welcomeText, ONBOARDING_KEYBOARD);
  },
});

/**
 * Send timezone picker keyboard.
 */
export const sendTimezonePicker = internalAction({
  args: { chatId: v.string() },
  handler: async (_ctx, { chatId }) => {
    const opts = getSendOptions(chatId);
    await sendInlineKeyboard(opts,
      "Where are you located?",
      [
        [
          { text: "🇦🇪 Dubai", callback_data: "ob:tz:Asia/Dubai" },
          { text: "🇸🇦 Riyadh", callback_data: "ob:tz:Asia/Riyadh" },
        ],
        [
          { text: "🇬🇧 London", callback_data: "ob:tz:Europe/London" },
          { text: "🇫🇷 Paris", callback_data: "ob:tz:Europe/Paris" },
        ],
        [
          { text: "🇺🇸 New York", callback_data: "ob:tz:America/New_York" },
          { text: "🇮🇳 Mumbai", callback_data: "ob:tz:Asia/Kolkata" },
        ],
        [{ text: "⌨️ Type a city instead", callback_data: "ob:tz:type" }],
      ]
    );
  },
});

/**
 * Send language picker keyboard.
 */
export const sendLanguagePicker = internalAction({
  args: { chatId: v.string() },
  handler: async (_ctx, { chatId }) => {
    const opts = getSendOptions(chatId);
    await sendInlineKeyboard(opts,
      "Which language should I use?",
      [
        [
          { text: "🇬🇧 English", callback_data: "ob:lang:en" },
          { text: "🇦🇪 العربية", callback_data: "ob:lang:ar" },
        ],
        [
          { text: "🇫🇷 Français", callback_data: "ob:lang:fr" },
          { text: "🇮🇳 हिन्दी", callback_data: "ob:lang:hi" },
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
    if (!user.telegramId || user.telegramId !== chatId) {
      console.error(`[telegram] chatId mismatch for ${userId}: expected ${user.telegramId}, got ${chatId}`);
      return;
    }

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
    const user = await ctx.runQuery(internal.users.internalGetUser, { userId });
    if (!user || user.optedOut || user.blocked) return;
    if (!user.telegramId || user.telegramId !== chatId) {
      console.error(`[telegram] chatId mismatch for ${userId}: expected ${user.telegramId}, got ${chatId}`);
      return;
    }

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
