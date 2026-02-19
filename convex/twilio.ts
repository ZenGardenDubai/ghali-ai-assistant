import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { sendWhatsAppMessage, sendWhatsAppMedia } from "./lib/twilioSend";

function getTwilioOptions(to: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error("Missing Twilio environment variables");
  }

  return { accountSid, authToken, from, to };
}

export const sendMessage = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (_ctx, { to, body }) => {
    await sendWhatsAppMessage(getTwilioOptions(to), body);
  },
});

export const sendMedia = internalAction({
  args: {
    to: v.string(),
    caption: v.string(),
    mediaUrl: v.string(),
  },
  handler: async (_ctx, { to, caption, mediaUrl }) => {
    await sendWhatsAppMedia(getTwilioOptions(to), caption, mediaUrl);
  },
});
