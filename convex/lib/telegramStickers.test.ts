import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getStickerForEvent,
  isStickerPackConfigured,
  sendTelegramSticker,
  sendEventSticker,
  STICKER_FILE_IDS,
  type StickerEvent,
} from "./telegramStickers";

// ============================================================================
// STICKER_FILE_IDS
// ============================================================================

describe("STICKER_FILE_IDS", () => {
  it("defines all required StickerEvent keys", () => {
    const requiredKeys: StickerEvent[] = [
      "welcome",
      "thinking",
      "celebrating",
      "working",
      "error",
      "goodnight",
      "image_generated",
      "credits_exhausted",
      "love",
      "idea",
    ];
    for (const key of requiredKeys) {
      expect(STICKER_FILE_IDS).toHaveProperty(key);
      expect(typeof STICKER_FILE_IDS[key]).toBe("string");
    }
  });
});

// ============================================================================
// getStickerForEvent
// ============================================================================

describe("getStickerForEvent", () => {
  it("returns a string for every StickerEvent", () => {
    const events: StickerEvent[] = [
      "welcome",
      "thinking",
      "celebrating",
      "working",
      "error",
      "goodnight",
      "image_generated",
      "credits_exhausted",
      "love",
      "idea",
    ];
    for (const event of events) {
      expect(typeof getStickerForEvent(event)).toBe("string");
    }
  });

  it("returns the file_id stored in STICKER_FILE_IDS", () => {
    // Temporarily patch one entry to test round-trip
    const original = STICKER_FILE_IDS.welcome;
    STICKER_FILE_IDS.welcome = "test_file_id_123";
    expect(getStickerForEvent("welcome")).toBe("test_file_id_123");
    STICKER_FILE_IDS.welcome = original;
  });
});

// ============================================================================
// isStickerPackConfigured
// ============================================================================

describe("isStickerPackConfigured", () => {
  afterEach(() => {
    // Reset all file_ids to empty strings after each test
    for (const key of Object.keys(STICKER_FILE_IDS) as StickerEvent[]) {
      STICKER_FILE_IDS[key] = "";
    }
  });

  it("returns false when all file_ids are empty strings", () => {
    expect(isStickerPackConfigured()).toBe(false);
  });

  it("returns true when at least one file_id is populated", () => {
    STICKER_FILE_IDS.welcome = "some_real_file_id";
    expect(isStickerPackConfigured()).toBe(true);
  });
});

// ============================================================================
// sendTelegramSticker
// ============================================================================

describe("sendTelegramSticker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns message_id on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 42 } }),
      })
    );

    const result = await sendTelegramSticker("bot_token", "chat123", "file_id_abc");
    expect(result).toBe(42);
  });

  it("calls the correct Telegram API endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await sendTelegramSticker("my_token", "456", "sticker_id");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.telegram.org/botmy_token/sendSticker",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ chat_id: "456", sticker: "sticker_id" }),
      })
    );
  });

  it("returns undefined when HTTP response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ ok: false }),
      })
    );

    const result = await sendTelegramSticker("bot_token", "chat123", "bad_id");
    expect(result).toBeUndefined();
  });

  it("returns undefined when Telegram API returns ok: false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: false,
          description: "Bad Request: wrong file_id",
        }),
      })
    );

    const result = await sendTelegramSticker("bot_token", "chat123", "invalid");
    expect(result).toBeUndefined();
  });
});

// ============================================================================
// sendEventSticker
// ============================================================================

describe("sendEventSticker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of Object.keys(STICKER_FILE_IDS) as StickerEvent[]) {
      STICKER_FILE_IDS[key] = "";
    }
  });

  it("returns undefined without calling fetch when pack is not configured", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendEventSticker("token", "chat", "welcome");
    expect(result).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns undefined for an event with no file_id even when other events are configured", async () => {
    STICKER_FILE_IDS.welcome = "file_id_welcome";
    // "error" is still empty
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendEventSticker("token", "chat", "error");
    expect(result).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends the sticker when pack is configured and event has a file_id", async () => {
    STICKER_FILE_IDS.celebrating = "file_id_celebrate";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 99 } }),
      })
    );

    const result = await sendEventSticker("token", "chat", "celebrating");
    expect(result).toBe(99);
  });
});
