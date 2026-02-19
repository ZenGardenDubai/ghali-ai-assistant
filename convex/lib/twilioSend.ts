/**
 * Twilio outbound message sending.
 * Used as a Convex action since it needs HTTP access.
 */
import { splitLongMessage } from "./utils";

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
  const chunks = splitLongMessage(body);

  for (const chunk of chunks) {
    await twilioApiCall(options, chunk);
  }
}

export async function sendWhatsAppMedia(
  options: TwilioSendOptions,
  caption: string,
  mediaUrl: string
): Promise<void> {
  await twilioApiCall(options, caption, mediaUrl);
}
