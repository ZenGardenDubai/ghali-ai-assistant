import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { validateWebhookSignature, parseCloudApiWebhook, parseCloudApiStatuses } from "./lib/whatsapp";
import type { CloudApiWebhookPayload } from "./lib/whatsapp";
import { isBlockedCountryCode } from "./lib/utils";
import { validateClerkWebhook } from "./lib/clerk";
import { MAX_MESSAGE_LENGTH, WHATSAPP_SESSION_WINDOW_MS } from "./constants";

/** Constant-time string comparison to prevent timing attacks on secret tokens. */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);
  let result = 0;
  for (let i = 0; i < viewA.length; i++) result |= viewA[i] ^ viewB[i];
  return result === 0;
}

const VALID_PERIODS = new Set(["today", "yesterday", "7d", "30d"]);

/** Normalize a WhatsApp number by stripping prefix and trimming whitespace. */
function normalizeWhatsappNumber(n: string | undefined): string {
  return (n ?? "").trim().replace(/^whatsapp:/, "");
}

let warnedMissingWhatsappNumber = false;

const http = httpRouter();

// WhatsApp Cloud API webhook verification (GET) — required by 360dialog/Meta
http.route({
  path: "/whatsapp-webhook",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && verifyToken && token === verifyToken) {
      console.log("[whatsapp-webhook] Verification challenge accepted");
      return new Response(challenge ?? "", { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  }),
});

// WhatsApp Cloud API webhook (POST) — receives messages from 360dialog
http.route({
  path: "/whatsapp-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // ALWAYS return 200 — non-200 causes retries which can amplify bugs.
    // The only exception is 403 for bad signatures.
    const ok = () => new Response("OK", { status: 200 });

    try {
      // Read raw body for signature validation
      const rawBody = await request.text();

      // Webhook authentication layer:
      // 1. When WEBHOOK_SECRET is set → HMAC-SHA256 signature validation (rejects unsigned/forged)
      // 2. When WEBHOOK_SECRET is unset → 360dialog v2 API does not reliably send
      //    X-Hub-Signature-256 headers, so signature validation is skipped.
      //    Security in this mode relies on: (a) the webhook URL being a secret known
      //    only to 360dialog, (b) country code blocking inside the processing loop,
      //    and (c) user-level rate limiting (outbound guard).
      // To enable signature validation, set WEBHOOK_SECRET in your Convex environment.
      const webhookSecret = process.env.WEBHOOK_SECRET;
      const signatureHeader = request.headers.get("X-Hub-Signature-256") ?? "";

      if (webhookSecret) {
        if (!(await validateWebhookSignature(webhookSecret, signatureHeader, rawBody))) {
          return new Response("Forbidden", { status: 403 });
        }
      }

      // Parse JSON payload
      let payload: CloudApiWebhookPayload;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        console.error("[whatsapp-webhook] Invalid JSON body");
        return ok();
      }

      // Process status updates (delivery tracking + block detection + analytics)
      const statusUpdates = parseCloudApiStatuses(payload);
      for (const statusUpdate of statusUpdates) {
        // Look up template name from wamid (null for non-template messages)
        const templateName = statusUpdate.wamid
          ? await ctx.runQuery(internal.outboundMessages.getTemplateByWamid, {
              wamid: statusUpdate.wamid,
            })
          : null;

        if (statusUpdate.isBlocked) {
          await ctx.runMutation(internal.users.markUserBlocked, {
            phone: statusUpdate.recipientPhone,
            errorCode: statusUpdate.errorCode,
            errorMessage: statusUpdate.errorMessage,
            timestamp: statusUpdate.timestamp,
          });
          // Fire PostHog blocked + failed events (fire-and-forget)
          ctx.scheduler.runAfter(0, internal.analytics.trackWhatsAppBlocked, {
            phone: statusUpdate.recipientPhone,
            error_code: statusUpdate.errorCode,
            error_message: statusUpdate.errorMessage,
            template_name: templateName ?? undefined,
          });
          ctx.scheduler.runAfter(0, internal.analytics.trackWhatsAppFailed, {
            phone: statusUpdate.recipientPhone,
            error_code: statusUpdate.errorCode,
            error_message: statusUpdate.errorMessage,
            is_blocked: true,
            template_name: templateName ?? undefined,
          });
        } else if (statusUpdate.status === "failed") {
          // Non-block failure (e.g. session expired, rate limit)
          ctx.scheduler.runAfter(0, internal.analytics.trackWhatsAppFailed, {
            phone: statusUpdate.recipientPhone,
            error_code: statusUpdate.errorCode,
            error_message: statusUpdate.errorMessage,
            is_blocked: false,
            template_name: templateName ?? undefined,
          });
        } else if (statusUpdate.status === "delivered" || statusUpdate.status === "read") {
          await ctx.runMutation(internal.users.trackDeliveryStatus, {
            phone: statusUpdate.recipientPhone,
            status: statusUpdate.status,
            timestamp: statusUpdate.timestamp,
          });
          const analyticsFn = statusUpdate.status === "delivered"
            ? internal.analytics.trackWhatsAppDelivered
            : internal.analytics.trackWhatsAppRead;
          ctx.scheduler.runAfter(0, analyticsFn, {
            phone: statusUpdate.recipientPhone,
            timestamp: statusUpdate.timestamp
              ? new Date(statusUpdate.timestamp).toISOString()
              : undefined,
            template_name: templateName ?? undefined,
          });
        }
      }

      // Parse Cloud API messages
      const messages = parseCloudApiWebhook(payload);
      if (messages.length === 0) {
        return ok();
      }

      // Process each message (usually just one per webhook)
      for (const message of messages) {
        // Ignore messages from Ghali's own number (prevent feedback loops)
        const ghaliNumber = normalizeWhatsappNumber(process.env.WHATSAPP_NUMBER);
        if (!ghaliNumber && !warnedMissingWhatsappNumber) {
          warnedMissingWhatsappNumber = true;
          console.warn("WHATSAPP_NUMBER not set — self-message filter disabled");
        }
        if (ghaliNumber && normalizeWhatsappNumber(message.from) === ghaliNumber) {
          continue;
        }

        // Country code blocking
        if (isBlockedCountryCode(message.from)) {
          console.log(`Blocked message from ${message.from}`);
          continue;
        }

        // Truncate overly long messages (cost amplification protection)
        if (message.body.length > MAX_MESSAGE_LENGTH) {
          message.body = message.body.slice(0, MAX_MESSAGE_LENGTH);
        }

        // Message ID dedup — reject replayed webhooks (atomic check-and-mark)
        if (message.messageId) {
          const isNew = await ctx.runMutation(internal.webhookDedup.tryMarkProcessed, {
            messageSid: message.messageId,
          });
          if (!isNew) {
            console.log(`Duplicate message ${message.messageId}, skipping`);
            continue;
          }
        }

        // Fire typing indicator immediately (non-blocking)
        // Shows read receipt (blue ticks) + three-dot typing animation for up to 25s
        if (message.messageId) {
          ctx.scheduler.runAfter(0, internal.whatsapp.sendTypingIndicator, {
            messageId: message.messageId,
          });
        }

        // Find or create user + schedule async processing
        const userId = await ctx.runMutation(internal.users.findOrCreateUser, {
          phone: message.from,
          name: message.profileName,
        });

        // Schedule async message processing
        await ctx.runMutation(internal.messages.saveIncoming, {
          userId,
          body: message.body,
          mediaUrl: message.mediaId, // Pass media ID (downloaded later via 360dialog API)
          mediaContentType: message.mediaContentType,
          messageSid: message.messageId,
          originalRepliedMessageSid: message.quotedMessageId,
        });
      }

      return ok();
    } catch (error) {
      // Catch-all: log the error but ALWAYS return 200 to prevent retries
      console.error("[whatsapp-webhook] Unhandled error:", error);
      return ok();
    }
  }),
});

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateClerkWebhook(request);
    if (!event) {
      return new Response("Verification failed", { status: 400 });
    }

    console.log(`Clerk webhook received: ${event.type}`, { id: event.data.id });

    switch (event.type) {
      case "subscriptionItem.active": {
        const activePayerId = event.data.payer?.user_id;
        console.log(`subscriptionItem.active — payer user_id: ${activePayerId}`);
        if (activePayerId) {
          await ctx.runMutation(internal.billing.handleSubscriptionActive, {
            clerkUserId: activePayerId,
          });
        }
        break;
      }
      case "subscriptionItem.canceled": {
        const cancelPayerId = event.data.payer?.user_id;
        if (cancelPayerId) {
          await ctx.runMutation(internal.billing.handleSubscriptionCanceled, {
            clerkUserId: cancelPayerId,
          });
        }
        break;
      }
      case "subscriptionItem.ended": {
        const endPayerId = event.data.payer?.user_id;
        if (endPayerId) {
          await ctx.runMutation(internal.billing.handleSubscriptionEnded, {
            clerkUserId: endPayerId,
          });
        }
        break;
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

http.route({
  path: "/link-phone",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Validate server-to-server secret
    const secret = request.headers.get("Authorization")?.replace("Bearer ", "");
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
      console.error("INTERNAL_API_SECRET not set");
      return new Response("Server error", { status: 500 });
    }

    if (!secret || !(await timingSafeEqual(secret, expectedSecret))) {
      return new Response("Forbidden", { status: 403 });
    }

    let body: { phone: string; clerkUserId: string; email?: string };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!body.phone || !body.clerkUserId) {
      return new Response("Missing phone or clerkUserId", { status: 400 });
    }

    const result = await ctx.runMutation(internal.billing.linkClerkUserByPhone, {
      phone: body.phone,
      clerkUserId: body.clerkUserId,
      email: body.email,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/account-data",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = request.headers.get("Authorization")?.replace("Bearer ", "");
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
      console.error("INTERNAL_API_SECRET not set");
      return new Response("Server error", { status: 500 });
    }
    if (!secret || !(await timingSafeEqual(secret, expectedSecret))) {
      return new Response("Forbidden", { status: 403 });
    }

    let body: { clerkUserId: string };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!body.clerkUserId) {
      return new Response("Missing clerkUserId", { status: 400 });
    }

    const result = await ctx.runQuery(internal.users.getAccountData, {
      clerkUserId: body.clerkUserId,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================================================
// Admin API endpoints (Bearer token auth via INTERNAL_API_SECRET)
// ============================================================================

function adminAuthHandler(
  handler: (ctx: Parameters<Parameters<typeof httpAction>[0]>[0], body: Record<string, unknown>) => Promise<Response>
) {
  return httpAction(async (ctx, request) => {
    const secret = request.headers.get("Authorization")?.replace("Bearer ", "");
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
      return new Response("Server error", { status: 500 });
    }
    if (!secret || !(await timingSafeEqual(secret, expectedSecret))) {
      return new Response("Forbidden", { status: 403 });
    }

    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    return handler(ctx, body);
  });
}

http.route({
  path: "/admin/verify",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const clerkUserId = body.clerkUserId as string;
    if (!clerkUserId) return new Response("Missing clerkUserId", { status: 400 });
    const result = await ctx.runQuery(internal.admin.verifyAdmin, { clerkUserId });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/stats",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const period = (body.period as string) || "today";
    if (!VALID_PERIODS.has(period)) {
      return new Response("Invalid period", { status: 400 });
    }
    const all = await ctx.runQuery(internal.admin.getStats, {});
    // Map the consolidated stats snapshot to the period-specific response shape.
    let newUsers: number;
    let activeUsers: number;
    switch (period) {
      case "yesterday":
        newUsers = all.newYesterday;
        activeUsers = all.activeYesterday;
        break;
      case "7d":
        newUsers = all.newWeek;
        activeUsers = all.activeWeek;
        break;
      case "30d":
        newUsers = all.newMonth;
        activeUsers = all.activeMonth;
        break;
      default: // "today"
        newUsers = all.newToday;
        activeUsers = all.activeToday;
    }
    return new Response(
      JSON.stringify({
        totalUsers: all.totalUsers,
        newUsers,
        activeUsers,
        proUsers: all.proUsers,
        basicUsers: all.basicUsers,
        blockedUsers: all.blockedUsers,
        activityLevels: {
          active: all.activityActive,
          inactive7d: all.activity7d,
          inactive30d: all.activity30d,
          inactive60d: all.activity60d,
          inactive90d: all.activity90d,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }),
});

http.route({
  path: "/admin/recent-users",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const limit = Math.min(typeof body.limit === "number" ? body.limit : 20, 100);
    const result = await ctx.runQuery(internal.admin.getRecentUsers, { limit });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/broadcast-counts",
  method: "POST",
  handler: adminAuthHandler(async (ctx) => {
    const result = await ctx.runQuery(internal.admin.getBroadcastCounts);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/template-status",
  method: "POST",
  handler: adminAuthHandler(async (ctx) => {
    const result = await ctx.runQuery(internal.admin.getTemplateStatus);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/generate-upload-url",
  method: "POST",
  handler: adminAuthHandler(async (ctx) => {
    const uploadUrl = await ctx.runMutation(internal.admin.generateUploadUrl);
    return new Response(JSON.stringify({ uploadUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/get-storage-url",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const storageId = body.storageId as string;
    if (!storageId) {
      return new Response("Missing storageId", { status: 400 });
    }
    const url = await ctx.runQuery(internal.admin.getStorageUrl, {
      storageId: storageId as Id<"_storage">,
    });
    if (!url) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/send-test-template",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const { templateName, variables, adminPhone, mediaUrl } = body as {
      templateName: string;
      variables: Record<string, string>;
      adminPhone: string;
      mediaUrl?: string;
    };
    if (!templateName || !variables || !adminPhone) {
      return new Response("Missing templateName, variables, or adminPhone", { status: 400 });
    }
    const result = await ctx.runAction(internal.admin.sendTestTemplate, {
      templateName,
      variables,
      adminPhone,
      mediaUrl,
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/send-template",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const { phone, templateName, variables, mediaUrl } = body as {
      phone: string;
      templateName: string;
      variables: Record<string, string>;
      mediaUrl?: string;
    };
    if (!phone || !templateName || !variables) {
      return new Response("Missing phone, templateName, or variables", { status: 400 });
    }
    const result = await ctx.runAction(internal.admin.sendTemplateToUser, {
      phone,
      templateName,
      variables,
      mediaUrl,
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/send-template-broadcast",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const { templateName, variables, messageBody, mediaUrl } = body as {
      templateName: string;
      variables: Record<string, string>;
      messageBody?: string;
      mediaUrl?: string;
    };
    if (!templateName || !variables) {
      return new Response("Missing templateName or variables", { status: 400 });
    }
    const result = await ctx.runAction(internal.admin.sendTemplateBroadcast, {
      templateName,
      variables,
      messageBody,
      mediaUrl,
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================================================
// Admin onboarding config endpoints
// ============================================================================

http.route({
  path: "/admin/onboarding-config",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const action = body.action as string | undefined;

    if (action === "delete") {
      await ctx.runMutation(internal.appConfig.deleteConfig, { key: "onboarding_image" });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      const storageId = body.storageId;
      const url = body.url;
      const enabledRaw = body.enabled;

      if (typeof storageId !== "string" || typeof url !== "string" || !storageId || !url) {
        return new Response("Missing storageId or url", { status: 400 });
      }
      const enabled = typeof enabledRaw === "boolean" ? enabledRaw : true;

      // If replacing, delete old storage file first
      const existing = await ctx.runQuery(internal.appConfig.getConfig, { key: "onboarding_image" });
      if (existing) {
        try {
          const old = JSON.parse(existing.value);
          if (old.storageId && old.storageId !== storageId) {
            await ctx.storage.delete(old.storageId as Id<"_storage">);
          }
        } catch { /* ignore */ }
      }

      await ctx.runMutation(internal.appConfig.setConfig, {
        key: "onboarding_image",
        value: JSON.stringify({ storageId, url, enabled }),
      });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default: GET — return current config
    const config = await ctx.runQuery(internal.appConfig.getConfig, { key: "onboarding_image" });
    if (!config) {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    try {
      return new Response(JSON.stringify(JSON.parse(config.value)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================================================
// Feedback endpoints (public — token IS the auth)
// ============================================================================

http.route({
  path: "/feedback/validate-token",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: { token: string };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!body.token) {
      return new Response("Missing token", { status: 400 });
    }

    const result = await ctx.runQuery(internal.feedback.validateFeedbackToken, {
      token: body.token,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/feedback/submit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: { token: string; category: string; message: string };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!body.token || !body.category || !body.message) {
      return new Response("Missing token, category, or message", { status: 400 });
    }

    const validCategories = ["bug", "feature_request", "general"];
    if (!validCategories.includes(body.category)) {
      return new Response("Invalid category", { status: 400 });
    }

    const result = await ctx.runMutation(internal.feedback.submitFeedbackViaToken, {
      token: body.token,
      category: body.category as "bug" | "feature_request" | "general",
      message: body.message,
    });

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/feedback/submit-web",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Bearer token auth (server-to-server from Next.js API route)
    const secret = request.headers.get("Authorization")?.replace("Bearer ", "");
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
      return new Response("Server error", { status: 500 });
    }
    if (!secret || !(await timingSafeEqual(secret, expectedSecret))) {
      return new Response("Forbidden", { status: 403 });
    }

    let body: { phone: string; category: string; message: string };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!body.phone || !body.category || !body.message) {
      return new Response("Missing phone, category, or message", { status: 400 });
    }

    const validCategories = ["bug", "feature_request", "general"];
    if (!validCategories.includes(body.category)) {
      return new Response("Invalid category", { status: 400 });
    }

    // Look up user by phone
    const user = await ctx.runQuery(internal.users.getUserByPhone, {
      phone: body.phone,
    });

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "user_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runMutation(internal.feedback.submitFeedback, {
      userId: user._id,
      category: body.category as "bug" | "feature_request" | "general",
      message: body.message,
      source: "web",
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================================================
// Admin feedback endpoints (Bearer token auth via INTERNAL_API_SECRET)
// ============================================================================

http.route({
  path: "/admin/feedback/list",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const result = await ctx.runQuery(internal.feedback.listFeedback, {
      status: body.status as "new" | "read" | "in_progress" | "resolved" | "archived" | undefined,
      category: body.category as "bug" | "feature_request" | "general" | undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/feedback/update-status",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const { feedbackId, status } = body as { feedbackId: string; status: string };
    if (!feedbackId || !status) {
      return new Response("Missing feedbackId or status", { status: 400 });
    }
    const validStatuses = ["new", "read", "in_progress", "resolved", "archived"];
    if (!validStatuses.includes(status)) {
      return new Response("Invalid status", { status: 400 });
    }
    const result = await ctx.runMutation(internal.feedback.updateFeedbackStatus, {
      feedbackId: feedbackId as Id<"feedback">,
      status: status as "new" | "read" | "in_progress" | "resolved" | "archived",
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/feedback/update-notes",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const { feedbackId, notes } = body as { feedbackId: string; notes: string };
    if (!feedbackId || notes === undefined) {
      return new Response("Missing feedbackId or notes", { status: 400 });
    }
    const result = await ctx.runMutation(internal.feedback.updateFeedbackNotes, {
      feedbackId: feedbackId as Id<"feedback">,
      notes,
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/feedback/stats",
  method: "POST",
  handler: adminAuthHandler(async (ctx) => {
    const result = await ctx.runQuery(internal.feedback.getFeedbackStats, {});
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/admin/feedback/reply",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const { feedbackId, message } = body as { feedbackId: string; message: string };
    if (!feedbackId || !message) {
      return new Response("Missing feedbackId or message", { status: 400 });
    }
    // Get the feedback to find the phone number
    const feedback = await ctx.runQuery(internal.feedback.getFeedbackById, {
      feedbackId: feedbackId as Id<"feedback">,
    });
    if (!feedback) {
      return new Response(JSON.stringify({ error: "Feedback not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user is within 24h WhatsApp session window
    const user = await ctx.runQuery(internal.admin.searchUser, {
      phone: feedback.phone,
    });
    const withinWindow =
      user?.lastMessageAt &&
      Date.now() - user.lastMessageAt < WHATSAPP_SESSION_WINDOW_MS;

    if (withinWindow) {
      await ctx.runAction(internal.whatsapp.sendMessage, {
        to: feedback.phone,
        body: message,
      });
    } else {
      // Outside 24h window — use broadcast template as fallback
      await ctx.runAction(internal.whatsapp.sendTemplate, {
        to: feedback.phone,
        templateName: "ghali_broadcast_v2",
        variables: { "1": message },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
