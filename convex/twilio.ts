import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { sendWhatsAppMessage, sendWhatsAppMedia, sendWhatsAppTemplate } from "./lib/twilioSend";
import { TEMPLATE_DEFINITIONS } from "./admin";

const ALLOWED_TEMPLATE_KEYS: Set<string> = new Set(TEMPLATE_DEFINITIONS.map((t) => t.key));

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

export const sendTemplate = internalAction({
  args: {
    to: v.string(),
    templateEnvVar: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (_ctx, { to, templateEnvVar, variables }) => {
    if (!ALLOWED_TEMPLATE_KEYS.has(templateEnvVar)) {
      throw new Error(`Invalid template key: ${templateEnvVar}`);
    }
    const contentSid = process.env[templateEnvVar];
    if (!contentSid) {
      throw new Error(`Template env var ${templateEnvVar} not set`);
    }
    await sendWhatsAppTemplate(getTwilioOptions(to), contentSid, variables);
  },
});
