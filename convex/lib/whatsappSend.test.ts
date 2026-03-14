import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendWhatsAppMessage, sendWhatsAppMedia, sendWhatsAppTemplate, rewriteToProxy, downloadMedia } from "./whatsappSend";

const options = {
  apiKey: "test_api_key_123",
  to: "+971501234567",
};

describe("sendWhatsAppMessage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a text message via 360dialog Cloud API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.123" }] }), { status: 200 })
    );

    await sendWhatsAppMessage(options, "Hello!");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://waba-v2.360dialog.io/messages");
    expect(init?.method).toBe("POST");

    const body = JSON.parse(init?.body as string);
    expect(body.messaging_product).toBe("whatsapp");
    expect(body.to).toBe("971501234567");
    expect(body.type).toBe("text");
    expect(body.text.body).toBe("Hello!");
  });

  it("truncates long messages to a single API call (no splitting)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.123" }] }), { status: 200 })
    );

    const longText = "A".repeat(5000) + "\n\n" + "B".repeat(2000);
    await sendWhatsAppMessage(options, longText);

    // With MAX_MESSAGE_CHUNKS=1, should be exactly 1 API call (truncated)
    expect(fetchSpy.mock.calls.length).toBe(1);
    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body.text.body.length).toBeLessThanOrEqual(4096);
    expect(body.text.body).toContain("_(Message truncated — too long)_");
  });

  it("throws on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Bad Request", { status: 400 })
    );

    await expect(sendWhatsAppMessage(options, "Hello!")).rejects.toThrow(
      "360dialog API error"
    );
  });

  it("strips + prefix from phone number", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.123" }] }), { status: 200 })
    );

    await sendWhatsAppMessage(options, "Hello!");

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.to).toBe("971501234567"); // No + prefix
  });
});

describe("sendWhatsAppMedia", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends image with caption and URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.456" }] }), { status: 200 })
    );

    await sendWhatsAppMedia(
      options,
      "Check this image",
      "https://example.com/image.jpg"
    );

    expect(fetchSpy).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.type).toBe("image");
    expect(body.image.caption).toBe("Check this image");
    expect(body.image.link).toBe("https://example.com/image.jpg");
  });

  it("uses mediaTypeHint when provided instead of inferring from URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.doc1" }] }), { status: 200 })
    );

    // Convex storage URL has no extension — would default to "image" without hint
    await sendWhatsAppMedia(
      options,
      "Here's your PDF",
      "https://xxx.convex.cloud/api/storage/abc123",
      "document"
    );

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.type).toBe("document");
    expect(body.document.caption).toBe("Here's your PDF");
    expect(body.document.link).toBe("https://xxx.convex.cloud/api/storage/abc123");
  });

  it("falls back to URL inference when no mediaTypeHint provided", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.pdf1" }] }), { status: 200 })
    );

    await sendWhatsAppMedia(
      options,
      "Here's a PDF",
      "https://example.com/report.pdf"
    );

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.type).toBe("document");
  });
});

describe("sendWhatsAppTemplate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a template with name and parameters", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.789" }] }), { status: 200 })
    );

    await sendWhatsAppTemplate(options, "ghali_reminder", { "1": "Drink water" });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.type).toBe("template");
    expect(body.template.name).toBe("ghali_reminder");
    expect(body.template.language.code).toBe("en");
    expect(body.template.components[0].parameters[0].text).toBe("Drink water");
  });

  it("sends template with multiple variables", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.multi" }] }), { status: 200 })
    );

    await sendWhatsAppTemplate(options, "ghali_credits_refreshed", { "1": "60", "2": "Basic" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.template.name).toBe("ghali_credits_refreshed");
    expect(body.template.components[0].parameters).toHaveLength(2);
    expect(body.template.components[0].parameters[0].text).toBe("60");
    expect(body.template.components[0].parameters[1].text).toBe("Basic");
  });

  it("throws on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Invalid template", { status: 400 })
    );

    await expect(
      sendWhatsAppTemplate(options, "ghali_reminder", { "1": "test" })
    ).rejects.toThrow("360dialog API error");
  });
});

describe("downloadMedia", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns data on first successful attempt", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/file", mime_type: "image/jpeg" }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(new ArrayBuffer(8), { status: 200 }));

    const result = await downloadMedia("api_key", "media_id_123");

    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe("image/jpeg");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries Step 2 on transient failure and succeeds on second attempt", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/file", mime_type: "image/jpeg" }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response("Service Unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(new ArrayBuffer(8), { status: 200 }));

    const promise = downloadMedia("api_key", "media_id_123");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe("image/jpeg");
    expect(fetchSpy).toHaveBeenCalledTimes(3); // 1 meta + 2 data attempts
  });

  it("returns null when Step 2 fails all retries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/file", mime_type: "image/jpeg" }), { status: 200 })
      )
      .mockResolvedValue(new Response("Service Unavailable", { status: 503 }));

    const promise = downloadMedia("api_key", "media_id_123");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(5); // 1 meta + 4 data attempts (initial + 3 retries)
  });

  it("retries Step 1 on transient failure and succeeds on second attempt", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Service Unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/file", mime_type: "image/jpeg" }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(new ArrayBuffer(8), { status: 200 }));

    const promise = downloadMedia("api_key", "media_id_123");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(3); // 2 meta attempts + 1 data
  });

  it("returns null when Step 1 fails all retries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const promise = downloadMedia("api_key", "media_id_123");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(4); // 4 meta attempts (initial + 3 retries)
  });

  it("returns null when metadata has no download URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ mime_type: "image/jpeg" }), { status: 200 })
    );

    const result = await downloadMedia("api_key", "media_id_123");
    expect(result).toBeNull();
  });

  it("defaults mimeType to application/octet-stream when absent from metadata", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/file" }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4), { status: 200 }));

    const result = await downloadMedia("api_key", "media_id_123");
    expect(result?.mimeType).toBe("application/octet-stream");
  });
});

describe("rewriteToProxy", () => {
  const baseUrl = "https://waba-v2.360dialog.io";

  it("rewrites Facebook CDN URL to 360dialog proxy", () => {
    const fbUrl = "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=123&ext=456&hash=abc";
    const result = rewriteToProxy(fbUrl, baseUrl);
    expect(result).toContain("waba-v2.360dialog.io");
    expect(result).toContain("mid=123");
    expect(result).toContain("ext=456");
    expect(result).not.toContain("lookaside.fbsbx.com");
  });

  it("preserves URL that already matches base hostname", () => {
    const url = "https://waba-v2.360dialog.io/some/path?q=1";
    expect(rewriteToProxy(url, baseUrl)).toBe(url);
  });

  it("returns original URL for invalid input", () => {
    expect(rewriteToProxy("not-a-url", baseUrl)).toBe("not-a-url");
  });

  it("rewrites protocol and clears port", () => {
    const url = "http://cdn.example.com:8080/path";
    const result = rewriteToProxy(url, baseUrl);
    expect(result).toBe("https://waba-v2.360dialog.io/path");
  });
});
