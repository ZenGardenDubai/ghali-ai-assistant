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

/** Normalize phone number: strip whatsapp: prefix, then + prefix */
function normalizePhoneForApi(phone: string): string {
  return phone.replace(/^whatsapp:/, "").replace(/^\+/, "");
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

/**
 * Infer Cloud API media type from URL.
 * Cloud API types: image, document, audio, video.
 */
function inferMediaType(mediaUrl: string): "image" | "document" | "audio" | "video" {
  const lower = mediaUrl.toLowerCase();
  if (/\.(pdf|docx?|xlsx?|pptx?|csv|txt|rtf|odt)(\?|$)/.test(lower)) return "document";
  if (/\.(mp3|ogg|opus|aac|amr|wav|flac|m4a)(\?|$)/.test(lower)) return "audio";
  if (/\.(mp4|3gpp?|mov|avi|webm|mkv)(\?|$)/.test(lower)) return "video";
  return "image";
}

export async function sendWhatsAppMedia(
  options: WhatsAppSendOptions,
  caption: string,
  mediaUrl: string,
  mediaTypeHint?: "image" | "document" | "audio" | "video"
): Promise<void> {
  const to = normalizePhoneForApi(options.to);
  const mediaType = mediaTypeHint ?? inferMediaType(mediaUrl);

  await cloudApiCall(options.apiKey, {
    recipient_type: "individual",
    to,
    type: mediaType,
    [mediaType]: {
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
  variables: Record<string, string>,
  buttonUrlSuffix?: string
): Promise<void> {
  const to = normalizePhoneForApi(options.to);

  // Convert variables map ({"1": "value1", "2": "value2"}) to Cloud API parameters array
  const parameters = Object.keys(variables)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => ({
      type: "text" as const,
      text: variables[key],
    }));

  const components: Array<Record<string, unknown>> = [];
  if (parameters.length > 0) {
    components.push({ type: "body", parameters });
  }
  // URL button with dynamic suffix (e.g. phone number appended to base URL)
  if (buttonUrlSuffix) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: buttonUrlSuffix }],
    });
  }

  await cloudApiCall(options.apiKey, {
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components,
    },
  });
}

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

/**
 * Fetch with exponential backoff retry on non-2xx responses.
 * Returns the successful Response, or null if all attempts fail.
 */
async function fetchWithRetry(
  fetchFn: () => Promise<Response>,
  label: string
): Promise<Response | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetchFn();
    if (response.ok) return response;

    if (attempt < MAX_RETRIES) {
      console.warn(
        `[whatsappSend] ${label} attempt ${attempt + 1} failed (${response.status}), retrying...`
      );
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    } else {
      console.error(
        `[whatsappSend] ${label} failed after ${MAX_RETRIES + 1} attempts: ${response.status}`
      );
    }
  }
  return null;
}

/**
 * Download media from 360dialog Cloud API.
 * Step 1: GET media URL from 360dialog (with retry)
 * Step 2: Download binary data from the returned URL (with retry)
 */
export async function downloadMedia(
  apiKey: string,
  mediaId: string
): Promise<{ data: ArrayBuffer; mimeType: string } | null> {
  try {
    // Step 1: Get media URL
    const metaResponse = await fetchWithRetry(
      () => fetch(`${DIALOG360_BASE_URL}/${mediaId}`, {
        headers: { "D360-API-KEY": apiKey },
      }),
      "Media metadata fetch"
    );

    if (!metaResponse) return null;

    const meta = await metaResponse.json();
    const downloadUrl = meta.url;
    const mimeType = meta.mime_type ?? "application/octet-stream";

    if (!downloadUrl) {
      console.error("[whatsappSend] No download URL in media metadata");
      return null;
    }

    // Step 2: Download binary data via 360dialog proxy
    const dataResponse = await fetchWithRetry(
      () => fetch(rewriteToProxy(downloadUrl, DIALOG360_BASE_URL), {
        headers: { "D360-API-KEY": apiKey },
      }),
      "Media download"
    );

    if (!dataResponse) return null;

    const data = await dataResponse.arrayBuffer();
    return { data, mimeType };
  } catch (error) {
    console.error(`[whatsappSend] Media download error for ${mediaId}:`, error);
    return null;
  }
}

/**
 * Rewrite a media download URL to go through 360dialog's proxy.
 *
 * The 360dialog Cloud API metadata endpoint returns a Facebook CDN URL
 * (lookaside.fbsbx.com) which doesn't accept the D360-API-KEY header.
 * Replacing the host routes the request through 360dialog's proxy instead.
 * Falls back to the original URL if parsing fails.
 */
export function rewriteToProxy(downloadUrl: string, baseUrl: string): string {
  try {
    const base = new URL(baseUrl);
    const parsed = new URL(downloadUrl);
    if (parsed.hostname !== base.hostname) {
      parsed.hostname = base.hostname;
      parsed.protocol = base.protocol;
      parsed.port = "";
      return parsed.toString();
    }
    return downloadUrl;
  } catch {
    return downloadUrl;
  }
}
