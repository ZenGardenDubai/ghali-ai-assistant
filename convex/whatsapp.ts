import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { sendWhatsAppMessage, sendWhatsAppMedia, sendWhatsAppTemplate, downloadMedia } from "./lib/whatsappSend";
import { buildTypingIndicatorPayload } from "./lib/whatsapp";
import { TEMPLATE_DEFINITIONS } from "./admin";
import { TEMPLATE_INACTIVITY_GATE_MS } from "./constants";

const ALLOWED_TEMPLATE_NAMES: Set<string> = new Set(TEMPLATE_DEFINITIONS.map((t) => t.name));

function getApiKey(): string {
  const apiKey = process.env.DIALOG360_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DIALOG360_API_KEY environment variable");
  }
  return apiKey;
}

function getSendOptions(to: string) {
  return { apiKey: getApiKey(), to };
}

export const sendMessage = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (_ctx, { to, body }) => {
    await sendWhatsAppMessage(getSendOptions(to), body);
  },
});

export const sendMedia = internalAction({
  args: {
    to: v.string(),
    caption: v.string(),
    mediaUrl: v.string(),
    mediaType: v.optional(v.union(
      v.literal("image"),
      v.literal("document"),
      v.literal("audio"),
      v.literal("video"),
    )),
  },
  handler: async (_ctx, { to, caption, mediaUrl, mediaType }) => {
    await sendWhatsAppMedia(getSendOptions(to), caption, mediaUrl, mediaType);
  },
});

/**
 * Download media from 360dialog by media ID.
 * Returns the binary data and MIME type, or null on failure.
 */
export const fetchMedia = internalAction({
  args: {
    mediaId: v.string(),
  },
  handler: async (_ctx, { mediaId }) => {
    const apiKey = getApiKey();
    const result = await downloadMedia(apiKey, mediaId);
    if (!result) return null;

    // Convert ArrayBuffer to base64 for passing through Convex action boundary
    // Chunk to avoid call stack limits with large files (spread limit ~64KB)
    const bytes = new Uint8Array(result.data);
    let binary = "";
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    return { base64, mimeType: result.mimeType };
  },
});

export const sendTemplate = internalAction({
  args: {
    to: v.string(),
    templateName: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (_ctx, { to, templateName, variables }) => {
    if (!ALLOWED_TEMPLATE_NAMES.has(templateName)) {
      throw new Error(`Invalid template name: ${templateName}`);
    }
    await sendWhatsAppTemplate(getSendOptions(to), templateName, variables);
  },
});

/**
 * Guarded send: checks opt-out + outbound rate limit before sending a text message.
 * Used by background senders (billing, credits, etc.) that schedule sends from mutations.
 * Re-fetches user to catch opt-outs that happened after scheduling.
 */
export const guardedSendMessage = internalAction({
  args: {
    userId: v.id("users"),
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { userId, to, body }) => {
    // Re-check opt-out/dormant — user may have changed state between scheduling and execution
    const user = await ctx.runQuery(internal.users.internalGetUser, { userId });
    if (!user || user.optedOut || user.dormant) return;

    const guard = await ctx.runMutation(
      internal.outboundGuard.checkAndRecordOutbound,
      { userId }
    );
    if (!guard.allowed) {
      console.warn(`[outbound-guard] Blocked background send to ${userId}: ${guard.reason}`);
      return;
    }
    await sendWhatsAppMessage(getSendOptions(to), body);
  },
});

/**
 * Guarded template send: checks opt-out + outbound rate limit before sending a template.
 * Used by background senders that schedule template sends from mutations.
 * Re-fetches user to catch opt-outs that happened after scheduling.
 */
export const guardedSendTemplate = internalAction({
  args: {
    userId: v.id("users"),
    to: v.string(),
    templateName: v.string(),
    variables: v.record(v.string(), v.string()),
    skipInactivityGate: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, to, templateName, variables, skipInactivityGate }) => {
    if (!ALLOWED_TEMPLATE_NAMES.has(templateName)) {
      throw new Error(`Invalid template name: ${templateName}`);
    }
    // Re-check opt-out/dormant — user may have changed state between scheduling and execution
    const user = await ctx.runQuery(internal.users.internalGetUser, { userId });
    if (!user || user.optedOut || user.dormant) return;

    // 7-day inactivity gate — don't send templates to cold contacts
    // Skipped for user-initiated events (e.g. billing) where the notification is expected
    if (!skipInactivityGate && (!user.lastMessageAt || Date.now() - user.lastMessageAt > TEMPLATE_INACTIVITY_GATE_MS)) {
      console.log(`[template-gate] Skipped template to ${userId} — inactive >7 days`);
      return;
    }

    const guard = await ctx.runMutation(
      internal.outboundGuard.checkAndRecordOutbound,
      { userId }
    );
    if (!guard.allowed) {
      console.warn(`[outbound-guard] Blocked background template to ${userId}: ${guard.reason}`);
      return;
    }
    await sendWhatsAppTemplate(getSendOptions(to), templateName, variables);
  },
});

/**
 * Send a typing indicator to the user immediately after receiving their message.
 * Marks the incoming message as read (blue double-ticks) and shows the
 * three-dot typing animation for up to 25 seconds or until Ghali replies.
 * Errors are swallowed silently — a failed indicator must never block processing.
 */
export const sendTypingIndicator = internalAction({
  args: { messageId: v.string() },
  handler: async (_ctx, { messageId }) => {
    try {
      const apiKey = process.env.DIALOG360_API_KEY!;
      const baseUrl = process.env.DIALOG360_API_URL ?? "https://waba-v2.360dialog.io";
      await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "D360-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildTypingIndicatorPayload(messageId)),
      });
    } catch (err) {
      console.warn("[typing-indicator] Failed to send typing indicator:", err);
    }
  },
});
