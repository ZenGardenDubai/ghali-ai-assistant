import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { validateTwilioSignature, parseTwilioMessage } from "./lib/twilio";
import { isBlockedCountryCode } from "./lib/utils";

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

export default http;
