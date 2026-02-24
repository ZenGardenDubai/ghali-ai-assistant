import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
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
    const { templateEnvVar, variables } = body as {
      templateEnvVar: string;
      variables: Record<string, string>;
    };
    if (!templateEnvVar || !variables) {
      return new Response("Missing templateEnvVar or variables", { status: 400 });
    }
    const result = await ctx.runAction(internal.admin.sendTemplateBroadcast, {
      templateEnvVar,
      variables,
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
