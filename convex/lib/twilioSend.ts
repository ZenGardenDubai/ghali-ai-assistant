/**
 * Twilio outbound message sending.
 * Used as a Convex action since it needs HTTP access.
 */
import { splitLongMessage } from "./utils";
import { TWILIO_MESSAGE_DELAY_MS, MAX_MESSAGE_CHUNKS } from "../constants";
import { formatForWhatsApp } from "./formatter";

interface TwilioSendOptions {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
}

async function twilioApiCall(
  options: TwilioSendOptions,
  body: string,
  mediaUrl?: string
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${options.accountSid}/Messages.json`;

  const params = new URLSearchParams({
    From: `whatsapp:${options.from}`,
    To: `whatsapp:${options.to}`,
    Body: body,
  });

  if (mediaUrl) {
    params.append("MediaUrl", mediaUrl);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + btoa(`${options.accountSid}:${options.authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error (${response.status}): ${error}`);
  }
}

export async function sendWhatsAppMessage(
  options: TwilioSendOptions,
  body: string
): Promise<void> {
  const formatted = formatForWhatsApp(body);
  const chunks = splitLongMessage(formatted);

  // Defense-in-depth: hard cap on chunks even if splitLongMessage is misconfigured
  if (chunks.length > MAX_MESSAGE_CHUNKS) {
    console.error(
      `[twilioSend] CRITICAL: ${chunks.length} chunks exceed MAX_MESSAGE_CHUNKS (${MAX_MESSAGE_CHUNKS}). ` +
        `Truncating to prevent message flood. Original length: ${body.length} chars`
    );
    chunks.length = MAX_MESSAGE_CHUNKS;
  }

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, TWILIO_MESSAGE_DELAY_MS));
    }
    await twilioApiCall(options, chunks[i]);
  }
}

export async function sendWhatsAppMedia(
  options: TwilioSendOptions,
  caption: string,
  mediaUrl: string
): Promise<void> {
  await twilioApiCall(options, caption, mediaUrl);
}

/**
 * Fetch the body of a previously sent/received message by SID.
 * Used to provide reply-to-text context when a user quotes a text message.
 */
export async function fetchMessageBody(
  accountSid: string,
  authToken: string,
  messageSid: string
): Promise<string | null> {
  if (!/^SM[0-9a-f]{32}$/i.test(messageSid)) {
    throw new Error(`Invalid message SID format: ${messageSid}`);
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageSid}.json`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
    },
  });

  if (!response.ok) {
    throw new Error(`Twilio fetch message error (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return data.body ?? null;
}

/**
 * Send a WhatsApp Content Template message (works outside the 24h session window).
 * Uses ContentSid + ContentVariables instead of Body.
 */
export async function sendWhatsAppTemplate(
  options: TwilioSendOptions,
  contentSid: string,
  variables: Record<string, string>
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${options.accountSid}/Messages.json`;

  const params = new URLSearchParams({
    From: `whatsapp:${options.from}`,
    To: `whatsapp:${options.to}`,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(variables),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + btoa(`${options.accountSid}:${options.authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio template API error (${response.status}): ${error}`);
  }
}
