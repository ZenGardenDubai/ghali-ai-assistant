import { describe, it, expect } from "vitest";
import {
  validateTwilioSignature,
  parseTwilioMessage,
} from "./twilio";
import { createHmac } from "crypto";

function makeSignature(
  authToken: string,
  url: string,
  params: Record<string, string>
): string {
  const data =
    url +
    Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], "");
  return createHmac("sha1", authToken).update(data, "utf-8").digest("base64");
}

describe("validateTwilioSignature", () => {
  const authToken = "test_auth_token_12345";
  const url = "https://example.com/whatsapp-webhook";
  const params = { Body: "Hello", From: "whatsapp:+971501234567" };

  it("accepts valid signature", () => {
    const signature = makeSignature(authToken, url, params);
    expect(
      validateTwilioSignature(authToken, signature, url, params)
    ).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(
      validateTwilioSignature(authToken, "invalid_signature", url, params)
    ).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(
      validateTwilioSignature(authToken, "", url, params)
    ).toBe(false);
  });
});

describe("parseTwilioMessage", () => {
  it("parses text message", () => {
    const params = {
      From: "whatsapp:+971501234567",
      Body: "Hello Ghali",
      ProfileName: "Ahmad",
      NumMedia: "0",
    };

    const msg = parseTwilioMessage(params);
    expect(msg).toEqual({
      from: "+971501234567",
      body: "Hello Ghali",
      profileName: "Ahmad",
      mediaUrl: undefined,
      mediaContentType: undefined,
      numMedia: 0,
    });
  });

  it("parses media message", () => {
    const params = {
      From: "whatsapp:+971501234567",
      Body: "Check this out",
      ProfileName: "Ahmad",
      NumMedia: "1",
      MediaUrl0: "https://api.twilio.com/media/123",
      MediaContentType0: "image/jpeg",
    };

    const msg = parseTwilioMessage(params);
    expect(msg.mediaUrl).toBe("https://api.twilio.com/media/123");
    expect(msg.mediaContentType).toBe("image/jpeg");
    expect(msg.numMedia).toBe(1);
  });

  it("parses voice note", () => {
    const params = {
      From: "whatsapp:+971501234567",
      Body: "",
      NumMedia: "1",
      MediaUrl0: "https://api.twilio.com/media/456",
      MediaContentType0: "audio/ogg",
    };

    const msg = parseTwilioMessage(params);
    expect(msg.mediaContentType).toBe("audio/ogg");
    expect(msg.body).toBe("");
  });

  it("strips whatsapp: prefix from phone", () => {
    const msg = parseTwilioMessage({
      From: "whatsapp:+447911123456",
      Body: "Hi",
      NumMedia: "0",
    });
    expect(msg.from).toBe("+447911123456");
  });
});
