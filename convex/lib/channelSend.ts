/**
 * Channel-aware message routing for background senders.
 *
 * Background actions (heartbeat, reminders, billing, credits, scheduled tasks)
 * need to send messages to users on either WhatsApp or Telegram. This helper
 * checks the user's `channel` field and routes to the appropriate sender.
 *
 * For Telegram: always sends directly (no session window, no templates).
 * For WhatsApp: uses the existing session window + template fallback pattern.
 */
import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";

/**
 * Send a message to a user via their preferred channel.
 * For Telegram: sends directly via Bot API (no session window / template logic).
 * For WhatsApp: sends message if within session window, or template if outside.
 *
 * @param ctx - Convex action context
 * @param user - User document (must include channel, phone, telegramId, lastMessageAt)
 * @param body - Message text to send
 * @param templateFallback - WhatsApp template config for outside-session sends (optional)
 */
export async function sendToUser(
  ctx: ActionCtx,
  user: Doc<"users">,
  body: string,
  templateFallback?: {
    templateName: string;
    variables: Record<string, string>;
  }
): Promise<{ sent: boolean; method: "telegram" | "whatsapp_message" | "whatsapp_template" | "skipped" }> {
  if (user.channel === "telegram" && user.telegramId) {
    // Telegram: no session window, no templates — send via guarded path
    // (checks opt-out, blocked, outbound rate limit)
    await ctx.runAction(internal.telegram.guardedSendMessage, {
      userId: user._id,
      chatId: user.telegramId,
      body,
    });
    return { sent: true, method: "telegram" };
  }

  // WhatsApp: check session window
  const WHATSAPP_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;
  const withinWindow =
    user.lastMessageAt &&
    Date.now() - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;

  if (withinWindow) {
    await ctx.runAction(internal.whatsapp.sendMessage, {
      to: user.phone,
      body,
    });
    return { sent: true, method: "whatsapp_message" };
  }

  // Outside session window — use template if provided
  if (templateFallback) {
    await ctx.runAction(internal.whatsapp.sendTemplate, {
      to: user.phone,
      templateName: templateFallback.templateName,
      variables: templateFallback.variables,
    });
    return { sent: true, method: "whatsapp_template" };
  }

  return { sent: false, method: "skipped" };
}

/**
 * Get the chat identifier for a user based on their channel.
 * Returns telegramId for Telegram users, phone for WhatsApp users.
 */
export function getUserChatId(user: Doc<"users">): string {
  if (user.channel === "telegram" && user.telegramId) {
    return user.telegramId;
  }
  return user.phone;
}

/**
 * Check if a user is on Telegram.
 */
export function isTelegramUser(user: Doc<"users">): boolean {
  return user.channel === "telegram" && !!user.telegramId;
}
