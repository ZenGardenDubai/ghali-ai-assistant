import { describe, it, expect, vi, afterEach } from "vitest";
import { validateClerkWebhook } from "./clerk";

describe("validateClerkWebhook", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when CLERK_WEBHOOK_SECRET is not set", async () => {
    vi.stubEnv("CLERK_WEBHOOK_SECRET", "");

    const request = new Request("https://example.com/clerk-webhook", {
      method: "POST",
      body: "{}",
      headers: {
        "svix-id": "msg_123",
        "svix-timestamp": "1234567890",
        "svix-signature": "v1,invalid",
      },
    });

    const result = await validateClerkWebhook(request);
    expect(result).toBeNull();
  });

  it("returns null when svix verification fails", async () => {
    vi.stubEnv("CLERK_WEBHOOK_SECRET", "whsec_testsecret123456789012345678901234");

    const request = new Request("https://example.com/clerk-webhook", {
      method: "POST",
      body: JSON.stringify({ type: "user.created", data: {} }),
      headers: {
        "svix-id": "msg_123",
        "svix-timestamp": "1234567890",
        "svix-signature": "v1,invalidsignature",
      },
    });

    const result = await validateClerkWebhook(request);
    expect(result).toBeNull();
  });

  it("returns null when svix headers are missing", async () => {
    vi.stubEnv("CLERK_WEBHOOK_SECRET", "whsec_testsecret123456789012345678901234");

    const request = new Request("https://example.com/clerk-webhook", {
      method: "POST",
      body: "{}",
    });

    const result = await validateClerkWebhook(request);
    expect(result).toBeNull();
  });
});
