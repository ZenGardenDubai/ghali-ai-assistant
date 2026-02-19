/**
 * Twilio signature validation and message parsing utilities.
 */
import { createHmac } from "crypto";

export interface TwilioMessage {
  from: string; // E.164 phone number
  body: string;
  profileName?: string;
  mediaUrl?: string;
  mediaContentType?: string;
  numMedia: number;
}

/**
 * Validate Twilio request signature.
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // Sort params alphabetically and concatenate key+value
  const data =
    url +
    Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], "");

  const expected = createHmac("sha1", authToken)
    .update(data, "utf-8")
    .digest("base64");

  // Constant-time comparison
  if (signature.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Parse Twilio webhook form data into a structured message.
 */
export function parseTwilioMessage(
  params: Record<string, string>
): TwilioMessage {
  return {
    from: params["From"]?.replace("whatsapp:", "") ?? "",
    body: params["Body"] ?? "",
    profileName: params["ProfileName"] || undefined,
    mediaUrl: params["MediaUrl0"] || undefined,
    mediaContentType: params["MediaContentType0"] || undefined,
    numMedia: parseInt(params["NumMedia"] ?? "0", 10),
  };
}
