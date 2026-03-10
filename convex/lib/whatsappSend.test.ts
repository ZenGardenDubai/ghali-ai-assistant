import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendWhatsAppMessage, sendWhatsAppMedia, sendWhatsAppTemplate } from "./whatsappSend";

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

  it("returns the wamid from the API response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.abc123" }] }), { status: 200 })
    );

    const wamids = await sendWhatsAppMessage(options, "Hello!");
    expect(wamids).toEqual(["wamid.abc123"]);
  });

  it("returns empty array when API response has no wamid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [] }), { status: 200 })
    );

    const wamids = await sendWhatsAppMessage(options, "Hello!");
    expect(wamids).toEqual([]);
  });

  it("returns empty array when API response body is not parseable JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("OK", { status: 200 })
    );

    const wamids = await sendWhatsAppMessage(options, "Hello!");
    expect(wamids).toEqual([]);
  });

  it("splits long messages into multiple API calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.123" }] }), { status: 200 })
    );

    const longText = "A".repeat(5000) + "\n\n" + "B".repeat(2000);
    await sendWhatsAppMessage(options, longText);

    expect(fetchSpy.mock.calls.length).toBeGreaterThan(1);
  });

  it("returns a wamid for each chunk of a multi-chunk message", async () => {
    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      return new Response(
        JSON.stringify({ messages: [{ id: `wamid.chunk${callCount}` }] }),
        { status: 200 }
      );
    });

    const longText = "A".repeat(5000) + "\n\n" + "B".repeat(2000);
    const wamids = await sendWhatsAppMessage(options, longText);

    expect(wamids.length).toBeGreaterThan(1);
    expect(wamids[0]).toBe("wamid.chunk1");
    expect(wamids[1]).toBe("wamid.chunk2");
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

    await sendWhatsAppTemplate(options, "ghali_credits_reset", { "1": "60", "2": "Basic" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.template.name).toBe("ghali_credits_reset");
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
