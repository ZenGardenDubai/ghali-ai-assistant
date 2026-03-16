/**
 * Telegram Sticker Pack — Ghali Bot
 *
 * Sticker file_ids and helpers for sending contextual stickers.
 *
 * Usage:
 *   1. Run `pnpm tsx scripts/create-ghali-sticker-pack.ts` once to create the pack
 *      and populate STICKER_FILE_IDS below with the returned file_ids.
 *   2. Call `sendEventSticker(botToken, chatId, "welcome")` from telegram.ts.
 *
 * When merged with feat/telegram-integration, prefer calling telegramApiCall
 * from telegramSend.ts instead of the local fetch below to share retry logic.
 */

// ============================================================================
// Types
// ============================================================================

/** All named sticker events the bot can send contextually. */
export type StickerEvent =
  | "welcome"
  | "thinking"
  | "celebrating"
  | "working"
  | "error"
  | "goodnight"
  | "image_generated"
  | "credits_exhausted"
  | "love"
  | "idea";

// ============================================================================
// Constants — populate these after running the creation script
// ============================================================================

/**
 * Telegram file_ids for each Ghali sticker.
 *
 * After creating the pack via `scripts/create-ghali-sticker-pack.ts`, copy
 * the printed file_ids here. Reusing file_ids is free (no re-upload needed).
 *
 * Pack URL: https://t.me/addstickers/GhaliBot
 */
export const STICKER_FILE_IDS: Record<StickerEvent, string> = {
  /** Waving hello on /start */
  welcome: "",
  /** Thinking bubble — shown while processing complex tasks */
  thinking: "",
  /** Party hat + confetti — image generated, task complete */
  celebrating: "",
  /** Focused with laptop — long-running task in progress */
  working: "",
  /** Oops face — error occurred or request failed */
  error: "",
  /** Moon and stars — goodnight / low-activity farewell */
  goodnight: "",
  /** Sparkles burst — image generation success */
  image_generated: "",
  /** Empty battery — credits exhausted */
  credits_exhausted: "",
  /** Hearts — appreciation / positive response */
  love: "",
  /** Lightbulb — insight, idea, or pro tip */
  idea: "",
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Returns the file_id for a given sticker event.
 * Falls back to an empty string if the pack has not been configured yet.
 */
export function getStickerForEvent(event: StickerEvent): string {
  return STICKER_FILE_IDS[event] ?? "";
}

/**
 * Returns true when at least one file_id has been populated.
 * Guards against sending empty file_ids before the pack is created.
 */
export function isStickerPackConfigured(): boolean {
  return Object.values(STICKER_FILE_IDS).some((id) => id.length > 0);
}

// ============================================================================
// API
// ============================================================================

/**
 * Send a sticker by file_id (or URL for first upload) to a Telegram chat.
 * Returns the sent message_id, or undefined on failure.
 */
export async function sendTelegramSticker(
  botToken: string,
  chatId: string,
  sticker: string
): Promise<number | undefined> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendSticker`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, sticker }),
    }
  );

  if (!response.ok) {
    console.error(`[telegramStickers] sendSticker HTTP ${response.status}`);
    return undefined;
  }

  const data = (await response.json()) as {
    ok: boolean;
    result?: { message_id?: number };
    description?: string;
  };

  if (!data.ok) {
    console.error(`[telegramStickers] sendSticker API error: ${data.description}`);
    return undefined;
  }

  return data.result?.message_id;
}

/**
 * Send the contextual sticker for a named bot event.
 * No-ops silently if the sticker pack has not been configured yet.
 */
export async function sendEventSticker(
  botToken: string,
  chatId: string,
  event: StickerEvent
): Promise<number | undefined> {
  if (!isStickerPackConfigured()) return undefined;
  const stickerId = getStickerForEvent(event);
  if (!stickerId) return undefined;
  return sendTelegramSticker(botToken, chatId, stickerId);
}
