import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { validateTwilioSignature, parseTwilioMessage } from "./lib/twilio";
import { isBlockedCountryCode } from "./lib/utils";
import { validateClerkWebhook } from "./lib/clerk";

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

    // Find or create user + schedule async processing
    const userId = await ctx.runMutation(api.users.findOrCreateUser, {
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

export default http;
