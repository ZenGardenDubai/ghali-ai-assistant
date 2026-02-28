import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { validateTwilioSignature, parseTwilioMessage } from "./lib/twilio";
import { isBlockedCountryCode } from "./lib/utils";
import { validateClerkWebhook } from "./lib/clerk";
import { MAX_MESSAGE_LENGTH } from "./constants";

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

const http = httpRouter();

http.route({
  path: "/whatsapp-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Parse form data
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Validate Twilio signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = request.headers.get("X-Twilio-Signature") ?? "";

    if (!authToken) {
      console.error("TWILIO_AUTH_TOKEN not set");
      return new Response("Server error", { status: 500 });
    }

    const url = new URL(request.url);
    // Use the public-facing URL for signature validation
    const publicUrl =
      process.env.CONVEX_SITE_URL ??
      `${url.protocol}//${url.host}`;
    const validationUrl = `${publicUrl}/whatsapp-webhook`;

    if (!(await validateTwilioSignature(authToken, signature, validationUrl, params))) {
      return new Response("Forbidden", { status: 403 });
    }

    // Parse the message
    const message = parseTwilioMessage(params);

    // Country code blocking
    if (isBlockedCountryCode(message.from)) {
      console.log(`Blocked message from ${message.from}`);
      return new Response("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
    }

    // Truncate overly long messages (cost amplification protection)
    if (message.body.length > MAX_MESSAGE_LENGTH) {
      message.body = message.body.slice(0, MAX_MESSAGE_LENGTH);
    }

    // MessageSid dedup — reject replayed webhooks (atomic check-and-mark)
    if (message.messageSid) {
      const isNew = await ctx.runMutation(internal.webhookDedup.tryMarkProcessed, {
        messageSid: message.messageSid,
      });
      if (!isNew) {
        console.log(`Duplicate MessageSid ${message.messageSid}, skipping`);
        return new Response("<Response></Response>", {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      }
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
      mediaUrl: message.mediaUrl,
      mediaContentType: message.mediaContentType,
      messageSid: message.messageSid,
      originalRepliedMessageSid: message.originalRepliedMessageSid,
    });

    // Return 200 immediately
    return new Response("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
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
    const result = await ctx.runQuery(internal.admin.getDashboardStats, {
      period: period as "today" | "yesterday" | "7d" | "30d",
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
  path: "/admin/send-test-template",
  method: "POST",
  handler: adminAuthHandler(async (ctx, body) => {
    const { templateEnvVar, variables, adminPhone } = body as {
      templateEnvVar: string;
      variables: Record<string, string>;
      adminPhone: string;
    };
    if (!templateEnvVar || !variables || !adminPhone) {
      return new Response("Missing templateEnvVar, variables, or adminPhone", { status: 400 });
    }
    const result = await ctx.runAction(internal.admin.sendTestTemplate, {
      templateEnvVar,
      variables,
      adminPhone,
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
    const { phone, templateEnvVar, variables } = body as {
      phone: string;
      templateEnvVar: string;
      variables: Record<string, string>;
    };
    if (!phone || !templateEnvVar || !variables) {
      return new Response("Missing phone, templateEnvVar, or variables", { status: 400 });
    }
    const result = await ctx.runAction(internal.admin.sendTemplateToUser, {
      phone,
      templateEnvVar,
      variables,
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
    const { templateEnvVar, variables, messageBody } = body as {
      templateEnvVar: string;
      variables: Record<string, string>;
      messageBody?: string;
    };
    if (!templateEnvVar || !variables) {
      return new Response("Missing templateEnvVar or variables", { status: 400 });
    }
    const result = await ctx.runAction(internal.admin.sendTemplateBroadcast, {
      templateEnvVar,
      variables,
      messageBody,
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
    const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;
    const withinWindow =
      user?.lastMessageAt &&
      Date.now() - user.lastMessageAt < WHATSAPP_WINDOW_MS;

    if (withinWindow) {
      await ctx.runAction(internal.twilio.sendMessage, {
        to: feedback.phone,
        body: message,
      });
    } else {
      // Outside 24h window — use broadcast template as fallback
      await ctx.runAction(internal.twilio.sendTemplate, {
        to: feedback.phone,
        templateEnvVar: "TWILIO_TPL_BROADCAST",
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
