import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

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
    // TODO: Save message to agent thread
    // TODO: Schedule async response generation via ctx.scheduler.runAfter
    // For now, just log that we received the message
    console.log(
      `Received message from user ${userId}: ${body.slice(0, 50)}${mediaUrl ? " [media]" : ""}`
    );
  },
});
