/**
 * 360dialog / WhatsApp Cloud API webhook validation and message parsing.
 * Uses Web Crypto API (no Node.js dependency) for Convex runtime compatibility.
 */

import { inferMimeTypeFromFilename } from "./media";

export interface WhatsAppMessage {
  from: string; // E.164 phone number (e.g., "+971501234567")
  body: string;
  profileName?: string;
  mediaId?: string;
  mediaContentType?: string;
  hasMedia: boolean;
  messageId?: string; // wamid format
  quotedMessageId?: string; // context.id for replies
}

/**
 * Validate 360dialog / Cloud API webhook signature (HMAC-SHA256).
 * The signature header format is: sha256=<hex_digest>
 */
export async function validateWebhookSignature(
  secret: string,
  signatureHeader: string,
  body: string
): Promise<boolean> {
  if (!signatureHeader.startsWith("sha256=")) return false;

  const receivedHex = signatureHeader.slice(7);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
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
 * Parse a Cloud API webhook payload into structured messages.
 * Returns an array because a single webhook can contain multiple messages.
 * Returns empty array for status updates or other non-message events.
 */
export function parseCloudApiWebhook(
  payload: CloudApiWebhookPayload
): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = [];

  if (payload.object !== "whatsapp_business_account") return messages;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      if (!value?.messages) continue;

      // Build a contact name lookup
      const contactNames = new Map<string, string>();
      for (const contact of value.contacts ?? []) {
        if (contact.wa_id && contact.profile?.name) {
          contactNames.set(contact.wa_id, contact.profile.name);
        }
      }

      for (const msg of value.messages) {
        const from = msg.from ? `+${msg.from}` : "";
        const profileName = contactNames.get(msg.from) ?? undefined;

        let body = "";
        let mediaId: string | undefined;
        let mediaContentType: string | undefined;
        let hasMedia = false;

        switch (msg.type) {
          case "text":
            body = msg.text?.body ?? "";
            break;
          case "image":
            body = msg.image?.caption ?? "";
            mediaId = msg.image?.id;
            mediaContentType = msg.image?.mime_type;
            hasMedia = true;
            break;
          case "audio":
            mediaId = msg.audio?.id;
            mediaContentType = msg.audio?.mime_type;
            hasMedia = true;
            break;
          case "video":
            body = msg.video?.caption ?? "";
            mediaId = msg.video?.id;
            mediaContentType = msg.video?.mime_type;
            hasMedia = true;
            break;
          case "document": {
            body = msg.document?.caption ?? "";
            mediaId = msg.document?.id;
            const docMime = msg.document?.mime_type;
            // WhatsApp sometimes sends generic MIME (application/octet-stream)
            // or omits it entirely — infer from filename extension as fallback
            if (!docMime || docMime === "application/octet-stream") {
              mediaContentType =
                inferMimeTypeFromFilename(msg.document?.filename) ?? docMime;
            } else {
              mediaContentType = docMime;
            }
            hasMedia = true;
            break;
          }
          case "sticker":
            mediaId = msg.sticker?.id;
            mediaContentType = msg.sticker?.mime_type;
            hasMedia = true;
            break;
          case "location":
            body = msg.location
              ? `Location: ${msg.location.latitude}, ${msg.location.longitude}${msg.location.name ? ` (${msg.location.name})` : ""}`
              : "";
            break;
          case "contacts":
            body = "[Contact shared]";
            break;
          case "reaction":
            // Skip reactions — they're not actionable messages
            continue;
          default:
            body = `[Unsupported message type: ${msg.type}]`;
        }

        messages.push({
          from,
          body,
          profileName,
          mediaId,
          mediaContentType,
          hasMedia,
          messageId: msg.id,
          quotedMessageId: msg.context?.id,
        });
      }
    }
  }

  return messages;
}

// ============================================================================
// Status Webhook Parsing
// ============================================================================

/**
 * Error codes that indicate the user has blocked our number.
 * - 131049: Message failed because user blocked the business
 * - 131026: Message undeliverable (recipient not on WhatsApp or blocked)
 *
 * Excluded:
 * - 131047: Re-engagement message (session expired, not a block — user simply hasn't replied in 24h)
 * - 63018: Pair rate limit (transient throttle, not a block signal)
 */
const BLOCK_ERROR_CODES = new Set([131049, 131026]);

export interface ParsedStatusUpdate {
  recipientPhone: string; // E.164 with + prefix
  wamid: string; // WhatsApp message ID (for template tracking)
  status: "delivered" | "read" | "failed";
  timestamp: number;
  isBlocked: boolean;
  errorCode?: number;
  errorMessage?: string;
}

/**
 * Parse Cloud API status updates from a webhook payload.
 * Returns structured status updates for delivery tracking and block detection.
 */
export function parseCloudApiStatuses(
  payload: CloudApiWebhookPayload
): ParsedStatusUpdate[] {
  const updates: ParsedStatusUpdate[] = [];

  if (payload.object !== "whatsapp_business_account") return updates;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const statuses = change.value?.statuses;
      if (!statuses) continue;

      for (const status of statuses) {
        // Only process delivery, read, and failure statuses
        if (status.status === "sent") continue;
        if (status.status !== "delivered" && status.status !== "read" && status.status !== "failed") continue;

        const recipientPhone = status.recipient_id
          ? `+${status.recipient_id}`
          : "";
        if (!recipientPhone) continue;

        const firstError = status.errors?.[0];
        const isBlocked =
          status.status === "failed" &&
          !!firstError &&
          BLOCK_ERROR_CODES.has(firstError.code);

        updates.push({
          recipientPhone,
          wamid: status.id,
          status: status.status as "delivered" | "read" | "failed",
          timestamp: parseInt(status.timestamp, 10) * 1000, // seconds → ms
          isBlocked,
          errorCode: firstError?.code,
          errorMessage: firstError?.title ?? firstError?.message,
        });
      }
    }
  }

  return updates;
}

// ============================================================================
// Typing Indicator
// ============================================================================

/**
 * Build the payload for the 360dialog typing indicator API call.
 * Marks the incoming message as read (blue ticks) and shows typing dots
 * for up to 25 seconds or until Ghali replies.
 */
export function buildTypingIndicatorPayload(messageId: string): Record<string, unknown> {
  return {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
    typing_indicator: { type: "text" },
  };
}

// ============================================================================
// Cloud API Webhook Payload Types
// ============================================================================

export interface CloudApiWebhookPayload {
  object: string;
  entry?: CloudApiEntry[];
}

interface CloudApiEntry {
  id: string;
  changes?: CloudApiChange[];
}

interface CloudApiChange {
  value: CloudApiChangeValue;
  field: string;
}

interface CloudApiChangeValue {
  messaging_product: string;
  metadata?: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile?: { name: string };
    wa_id: string;
  }>;
  messages?: CloudApiMessage[];
  statuses?: CloudApiStatus[];
}

export interface CloudApiStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
  }>;
}

interface CloudApiMessage {
  from: string; // Without + prefix (e.g., "971501234567")
  id: string; // wamid format
  timestamp: string;
  type: string;
  context?: {
    from: string;
    id: string;
  };
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256?: string; caption?: string };
  audio?: { id: string; mime_type: string; voice?: boolean };
  video?: { id: string; mime_type: string; caption?: string };
  document?: {
    id: string;
    mime_type?: string;
    filename?: string;
    caption?: string;
  };
  sticker?: { id: string; mime_type: string };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}
