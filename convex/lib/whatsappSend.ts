/**
 * 360dialog / WhatsApp Cloud API outbound message sending.
 * Used as a Convex action since it needs HTTP access.
 */
import { splitLongMessage } from "./utils";
import { WHATSAPP_MESSAGE_DELAY_MS, MAX_MESSAGE_CHUNKS } from "../constants";
import { formatForWhatsApp } from "./formatter";

/** Base URL — configurable per environment (sandbox vs production) */
const DIALOG360_BASE_URL =
  process.env.DIALOG360_API_URL ?? "https://waba-v2.360dialog.io";

interface WhatsAppSendOptions {
  apiKey: string;
  to: string; // E.164 without + prefix (e.g., "971501234567")
}

/** Normalize phone number: strip + prefix and whatsapp: prefix */
function normalizePhoneForApi(phone: string): string {
  return phone.replace(/^\+/, "").replace(/^whatsapp:/, "");
}

async function cloudApiCall(
  apiKey: string,
  body: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`${DIALOG360_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": apiKey,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      ...body,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`360dialog API error (${response.status}): ${error}`);
  }
}

export async function sendWhatsAppMessage(
  options: WhatsAppSendOptions,
  body: string
): Promise<void> {
  const formatted = formatForWhatsApp(body);
  const chunks = splitLongMessage(formatted);

  // Defense-in-depth: hard cap on chunks even if splitLongMessage is misconfigured
  if (chunks.length > MAX_MESSAGE_CHUNKS) {
    console.error(
      `[whatsappSend] CRITICAL: ${chunks.length} chunks exceed MAX_MESSAGE_CHUNKS (${MAX_MESSAGE_CHUNKS}). ` +
        `Truncating to prevent message flood. Original length: ${body.length} chars`
    );
    chunks.length = MAX_MESSAGE_CHUNKS;
  }

  const to = normalizePhoneForApi(options.to);

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, WHATSAPP_MESSAGE_DELAY_MS));
    }
    await cloudApiCall(options.apiKey, {
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: chunks[i] },
    });
  }
}

export async function sendWhatsAppMedia(
  options: WhatsAppSendOptions,
  caption: string,
  mediaUrl: string
): Promise<void> {
  const to = normalizePhoneForApi(options.to);

  await cloudApiCall(options.apiKey, {
    recipient_type: "individual",
    to,
    type: "image",
    image: {
      link: mediaUrl,
      caption,
    },
  });
}

/**
 * Send a WhatsApp template message (works outside the 24h session window).
 * Uses Cloud API template format with named template + language + parameters.
 */
export async function sendWhatsAppTemplate(
  options: WhatsAppSendOptions,
  templateName: string,
  variables: Record<string, string>
): Promise<void> {
  const to = normalizePhoneForApi(options.to);

  // Convert variables map ({"1": "value1", "2": "value2"}) to Cloud API parameters array
  const parameters = Object.keys(variables)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => ({
      type: "text" as const,
      text: variables[key],
    }));

  await cloudApiCall(options.apiKey, {
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components: parameters.length > 0
        ? [{ type: "body", parameters }]
        : [],
    },
  });
}

/**
 * Download media from 360dialog Cloud API.
 * Step 1: GET media URL from 360dialog
 * Step 2: Download binary data from the returned URL
 */
export async function downloadMedia(
  apiKey: string,
  mediaId: string
): Promise<{ data: ArrayBuffer; mimeType: string } | null> {
  // Step 1: Get media URL
  const metaResponse = await fetch(
    `${DIALOG360_BASE_URL}/${mediaId}`,
    {
      headers: { "D360-API-KEY": apiKey },
    }
  );

  if (!metaResponse.ok) {
    console.error(
      `[whatsappSend] Media metadata fetch failed: ${metaResponse.status}`
    );
    return null;
  }

  const meta = await metaResponse.json();
  const downloadUrl = meta.url;
  const mimeType = meta.mime_type ?? "application/octet-stream";

  if (!downloadUrl) {
    console.error("[whatsappSend] No download URL in media metadata");
    return null;
  }

  // Step 2: Download binary data
  const dataResponse = await fetch(downloadUrl, {
    headers: { "D360-API-KEY": apiKey },
  });

  if (!dataResponse.ok) {
    console.error(
      `[whatsappSend] Media download failed: ${dataResponse.status}`
    );
    return null;
  }

  const data = await dataResponse.arrayBuffer();
  return { data, mimeType };
}
