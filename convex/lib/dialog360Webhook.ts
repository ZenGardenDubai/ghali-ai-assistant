/**
 * 360dialog / Meta Cloud API webhook signature validation and message parsing.
 * Uses Web Crypto API (no Node.js dependency) for Convex runtime compatibility.
 */

export interface WhatsAppMessage {
  from: string;              // E.164 without + (e.g. "971501234567")
  body: string;
  profileName?: string;
  mediaId?: string;          // 360dialog uses media IDs, not URLs
  mediaContentType?: string;
  numMedia: number;
  messageId: string;         // wamid
  originalRepliedMessageId?: string;
}

/** Raw shape of a 360dialog / Meta Cloud API webhook payload */
interface Dialog360WebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        messaging_product?: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string; caption?: string; mime_type?: string };
          video?: { id?: string; caption?: string; mime_type?: string };
          document?: { id?: string; caption?: string; mime_type?: string; filename?: string };
          audio?: { id?: string; mime_type?: string; voice?: boolean };
          voice?: { id?: string; mime_type?: string };
          interactive?: {
            type?: string;
            button_reply?: { id?: string; title?: string };
            list_reply?: { id?: string; title?: string; description?: string };
          };
          context?: { message_id?: string };
        }>;
      };
      field?: string;
    }>;
  }>;
}

/**
 * Validate 360dialog / Meta Cloud API webhook signature.
 * X-Hub-Signature-256: sha256=<HMAC-SHA256 of raw body using app secret>
 */
export async function validateDialog360Signature(
  appSecret: string,
  signature: string,
  rawBody: string
): Promise<boolean> {
  // Signature format: "sha256=<hex_digest>"
  if (!signature.startsWith("sha256=")) return false;
  const receivedHex = signature.slice(7);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (receivedHex.length !== expectedHex.length) return false;
  let result = 0;
  for (let i = 0; i < receivedHex.length; i++) {
    result |= receivedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Parse a 360dialog / Meta Cloud API webhook JSON body into a structured message.
 * Returns null if the payload does not contain a processable message.
 */
export function parseDialog360Message(
  payload: Dialog360WebhookPayload
): WhatsAppMessage | null {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];

  if (change?.field !== "messages") return null;

  const value = change.value;
  const rawMessage = value?.messages?.[0];
  if (!rawMessage) return null;

  const from = rawMessage.from ?? "";
  const messageId = rawMessage.id ?? "";
  const profileName = value?.contacts?.[0]?.profile?.name || undefined;
  const originalRepliedMessageId = rawMessage.context?.message_id || undefined;

  const type = rawMessage.type ?? "text";

  let body = "";
  let mediaId: string | undefined;
  let mediaContentType: string | undefined;
  let numMedia = 0;

  switch (type) {
    case "text":
      body = rawMessage.text?.body ?? "";
      break;

    case "image": {
      const img = rawMessage.image;
      body = img?.caption ?? "";
      mediaId = img?.id;
      mediaContentType = img?.mime_type ?? "image/jpeg";
      numMedia = mediaId ? 1 : 0;
      break;
    }

    case "video": {
      const vid = rawMessage.video;
      body = vid?.caption ?? "";
      mediaId = vid?.id;
      mediaContentType = vid?.mime_type ?? "video/mp4";
      numMedia = mediaId ? 1 : 0;
      break;
    }

    case "document": {
      const doc = rawMessage.document;
      body = doc?.caption ?? doc?.filename ?? "";
      mediaId = doc?.id;
      mediaContentType = doc?.mime_type ?? "application/octet-stream";
      numMedia = mediaId ? 1 : 0;
      break;
    }

    case "audio":
    case "voice": {
      const audio = rawMessage.audio ?? rawMessage.voice;
      mediaId = audio?.id;
      mediaContentType = audio?.mime_type ?? "audio/ogg";
      numMedia = mediaId ? 1 : 0;
      break;
    }

    case "interactive": {
      const interactive = rawMessage.interactive;
      if (interactive?.type === "button_reply") {
        body = interactive.button_reply?.title ?? interactive.button_reply?.id ?? "";
      } else if (interactive?.type === "list_reply") {
        body = interactive.list_reply?.title ?? interactive.list_reply?.id ?? "";
      }
      break;
    }

    default:
      // Unsupported message type — return null to skip processing
      return null;
  }

  return {
    from,
    body,
    profileName,
    mediaId,
    mediaContentType,
    numMedia,
    messageId,
    originalRepliedMessageId,
  };
}
