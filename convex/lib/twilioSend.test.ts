import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendWhatsAppMessage, sendWhatsAppMedia, sendWhatsAppTemplate } from "./twilioSend";

const options = {
  accountSid: "AC_test",
  authToken: "test_token",
  from: "+14155238886",
  to: "+971501234567",
};

describe("sendWhatsAppMessage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a text message via Twilio API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ sid: "SM123" }), { status: 201 })
    );

    await sendWhatsAppMessage(options, "Hello!");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain("AC_test/Messages.json");
    expect(init?.method).toBe("POST");

    const body = new URLSearchParams(init?.body as string);
    expect(body.get("From")).toBe("whatsapp:+14155238886");
    expect(body.get("To")).toBe("whatsapp:+971501234567");
    expect(body.get("Body")).toBe("Hello!");
  });

  it("splits long messages into multiple API calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ sid: "SM123" }), { status: 201 })
    );

    const longText = "A".repeat(5000) + "\n\n" + "B".repeat(2000);
    await sendWhatsAppMessage(options, longText);

    expect(fetchSpy.mock.calls.length).toBeGreaterThan(1);
  });

  it("throws on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Bad Request", { status: 400 })
    );

    await expect(sendWhatsAppMessage(options, "Hello!")).rejects.toThrow(
      "Twilio API error"
    );
  });
});

describe("sendWhatsAppMedia", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends media with caption and URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ sid: "SM123" }), { status: 201 })
    );

    await sendWhatsAppMedia(
      options,
      "Check this image",
      "https://example.com/image.jpg"
    );

    expect(fetchSpy).toHaveBeenCalledOnce();
    const body = new URLSearchParams(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.get("Body")).toBe("Check this image");
    expect(body.get("MediaUrl")).toBe("https://example.com/image.jpg");
  });
});

describe("sendWhatsAppTemplate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a template with ContentSid and ContentVariables", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ sid: "SM456" }), { status: 201 })
    );

    await sendWhatsAppTemplate(options, "HX1234567890", { "1": "Drink water" });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain("AC_test/Messages.json");
    expect(init?.method).toBe("POST");

    const body = new URLSearchParams(init?.body as string);
    expect(body.get("From")).toBe("whatsapp:+14155238886");
    expect(body.get("To")).toBe("whatsapp:+971501234567");
    expect(body.get("ContentSid")).toBe("HX1234567890");
    expect(body.get("ContentVariables")).toBe(JSON.stringify({ "1": "Drink water" }));
    // Template messages should NOT have a Body param
    expect(body.has("Body")).toBe(false);
  });

  it("sends template with multiple variables", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ sid: "SM789" }), { status: 201 })
    );

    await sendWhatsAppTemplate(options, "HXabcdef", { "1": "60", "2": "Basic" });

    const body = new URLSearchParams(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.get("ContentSid")).toBe("HXabcdef");
    const vars = JSON.parse(body.get("ContentVariables")!);
    expect(vars["1"]).toBe("60");
    expect(vars["2"]).toBe("Basic");
  });

  it("throws on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Invalid ContentSid", { status: 400 })
    );

    await expect(
      sendWhatsAppTemplate(options, "HXinvalid", { "1": "test" })
    ).rejects.toThrow("Twilio template API error");
  });
});
