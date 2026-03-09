/**
 * 360dialog outbound message sending (Meta Cloud API).
 * Used as a Convex action since it needs HTTP access.
 */
import { splitLongMessage } from "./utils";
import { MESSAGE_DELAY_MS, MAX_MESSAGE_CHUNKS } from "../constants";
import { formatForWhatsApp } from "./formatter";

const DIALOG360_API_URL = "https://waba.360dialog.io/v1/messages";

/**
 * Send a single request to the 360dialog Messages API.
 */
async function dialog360ApiCall(
  apiKey: string,
  payload: Record<string, unknown>
): Promise<void> {
  const response = await fetch(DIALOG360_API_URL, {
    method: "POST",
    headers: {
      "D360-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`360dialog API error (${response.status}): ${error}`);
  }
}

/**
 * Send a WhatsApp text message via 360dialog with chunking + delay.
 */
export async function sendWhatsAppMessage(
  apiKey: string,
  number: string,
  to: string,
  body: string
): Promise<void> {
  void number; // 360dialog derives sender from API key context
  const formatted = formatForWhatsApp(body);
  const chunks = splitLongMessage(formatted);

  // Defense-in-depth: hard cap on chunks even if splitLongMessage is misconfigured
  if (chunks.length > MAX_MESSAGE_CHUNKS) {
    console.error(
      `[dialog360Send] CRITICAL: ${chunks.length} chunks exceed MAX_MESSAGE_CHUNKS (${MAX_MESSAGE_CHUNKS}). ` +
        `Truncating to prevent message flood. Original length: ${body.length} chars`
    );
    chunks.length = MAX_MESSAGE_CHUNKS;
  }

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, MESSAGE_DELAY_MS));
    }
    await dialog360ApiCall(apiKey, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: chunks[i] },
    });
  }
}

/**
 * Send a WhatsApp media message via 360dialog.
 * mediaType: "image" | "document" | "audio"
 */
export async function sendWhatsAppMedia(
  apiKey: string,
  number: string,
  to: string,
  caption: string,
  mediaUrl: string,
  mediaType: "image" | "document" | "audio" = "image"
): Promise<void> {
  void number;
  const mediaPayload: Record<string, unknown> = { link: mediaUrl };
  if (caption && mediaType !== "audio") {
    mediaPayload.caption = caption;
  }
  await dialog360ApiCall(apiKey, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: mediaType,
    [mediaType]: mediaPayload,
  });
}

/**
 * Send a WhatsApp template message via 360dialog.
 * variables: positional array ["var1", "var2", ...] → {{1}}, {{2}}, ...
 */
export async function sendWhatsAppTemplate(
  apiKey: string,
  number: string,
  to: string,
  templateName: string,
  variables: string[]
): Promise<void> {
  void number;
  const components =
    variables.length > 0
      ? [
          {
            type: "body",
            parameters: variables.map((text) => ({ type: "text", text })),
          },
        ]
      : [];

  await dialog360ApiCall(apiKey, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components,
    },
  });
}
