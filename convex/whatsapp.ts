import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import {
  sendWhatsAppMessage,
  sendWhatsAppMedia,
  sendWhatsAppTemplate,
} from "./lib/dialog360Send";
import { TEMPLATE_DEFINITIONS } from "./admin";

const ALLOWED_TEMPLATE_KEYS: Set<string> = new Set(
  TEMPLATE_DEFINITIONS.map((t) => t.key)
);

function getDialog360Credentials() {
  const apiKey = process.env.DIALOG360_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DIALOG360_API_KEY environment variable");
  }
  const number = process.env.DIALOG360_WHATSAPP_NUMBER ?? "";
  return { apiKey, number };
}

export const sendMessage = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (_ctx, { to, body }) => {
    const { apiKey, number } = getDialog360Credentials();
    await sendWhatsAppMessage(apiKey, number, to, body);
  },
});

export const sendMedia = internalAction({
  args: {
    to: v.string(),
    caption: v.string(),
    mediaUrl: v.string(),
    mediaType: v.optional(v.union(v.literal("image"), v.literal("document"), v.literal("audio"))),
  },
  handler: async (_ctx, { to, caption, mediaUrl, mediaType }) => {
    const { apiKey, number } = getDialog360Credentials();
    await sendWhatsAppMedia(apiKey, number, to, caption, mediaUrl, mediaType ?? "image");
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

    // Look up the template name from TEMPLATE_DEFINITIONS
    const templateDef = TEMPLATE_DEFINITIONS.find((t) => t.key === templateEnvVar);
    if (!templateDef) {
      throw new Error(`Template definition not found for key: ${templateEnvVar}`);
    }

    // Convert { "1": "foo", "2": "bar" } → ["foo", "bar"] (sorted numerically by key)
    const varArray = Object.entries(variables)
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
      .map(([, val]) => val);

    const { apiKey, number } = getDialog360Credentials();
    await sendWhatsAppTemplate(apiKey, number, to, templateDef.name, varArray);
  },
});
