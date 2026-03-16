import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  telegramApiCall,
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramDocument,
  sendChatAction,
  getTelegramFile,
  sendInlineKeyboard,
  answerCallbackQuery,
  editMessageText,
} from "./telegramSend";

const BOT_TOKEN = "123456:ABC-DEF";
const CHAT_ID = "987654321";
const opts = { botToken: BOT_TOKEN, chatId: CHAT_ID };

function mockApiResponse(result: Record<string, unknown> = {}) {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({ ok: true, result }),
  });
}

function mockApiError(errorCode: number, description: string) {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({ ok: false, error_code: errorCode, description }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("telegramApiCall", () => {
  it("calls correct URL with POST and JSON body", async () => {
    mockApiResponse({ message_id: 1 });

    await telegramApiCall(BOT_TOKEN, "sendMessage", {
      chat_id: CHAT_ID,
      text: "Hello",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: "Hello" }),
      }
    );
  });

  it("throws on API error", async () => {
    mockApiError(400, "Bad Request: message text is empty");

    await expect(
      telegramApiCall(BOT_TOKEN, "sendMessage", { chat_id: CHAT_ID, text: "" })
    ).rejects.toThrow("Telegram API error (400): Bad Request: message text is empty");
  });
});

describe("sendTelegramMessage", () => {
  it("sends formatted HTML message", async () => {
    mockApiResponse({ message_id: 42 });

    const messageId = await sendTelegramMessage(opts, "Hello **world**");

    expect(messageId).toBe(42);
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.chat_id).toBe(CHAT_ID);
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toContain("<b>world</b>");
  });

  it("splits long messages into multiple chunks", async () => {
    // Create a message longer than 4096 chars
    const longText = "A".repeat(3000) + "\n\n" + "B".repeat(3000);

    // Mock responses for each chunk
    mockApiResponse({ message_id: 1 });
    mockApiResponse({ message_id: 2 });

    const messageId = await sendTelegramMessage(opts, longText);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(messageId).toBe(2); // returns last message_id
  });
});

describe("sendTelegramPhoto", () => {
  it("sends photo with caption", async () => {
    mockApiResponse({ message_id: 10 });

    await sendTelegramPhoto(opts, "https://example.com/photo.jpg", "Nice photo");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.photo).toBe("https://example.com/photo.jpg");
    expect(body.caption).toBe("Nice photo");
    expect(body.parse_mode).toBe("HTML");
  });

  it("sends photo without caption", async () => {
    mockApiResponse({ message_id: 10 });

    await sendTelegramPhoto(opts, "https://example.com/photo.jpg");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.photo).toBe("https://example.com/photo.jpg");
    expect(body.caption).toBeUndefined();
  });
});

describe("sendTelegramDocument", () => {
  it("sends document with caption", async () => {
    mockApiResponse({ message_id: 11 });

    await sendTelegramDocument(opts, "file_id_123", "Here is the file");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.document).toBe("file_id_123");
    expect(body.caption).toBe("Here is the file");
  });
});

describe("sendChatAction", () => {
  it("sends typing action", async () => {
    mockApiResponse({});

    await sendChatAction(opts, "typing");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe("typing");
  });

  it("does not throw on failure (best-effort)", async () => {
    mockApiError(400, "chat not found");

    // Should not throw
    await sendChatAction(opts, "typing");
  });
});

describe("getTelegramFile", () => {
  it("returns file path and size", async () => {
    mockApiResponse({
      file_id: "abc123",
      file_path: "photos/file_0.jpg",
      file_size: 12345,
    });

    const result = await getTelegramFile(BOT_TOKEN, "abc123");

    expect(result).toEqual({
      filePath: "photos/file_0.jpg",
      fileSize: 12345,
    });
  });

  it("returns null on error", async () => {
    mockApiError(400, "file not found");

    const result = await getTelegramFile(BOT_TOKEN, "bad_id");

    expect(result).toBeNull();
  });
});

describe("editMessageText", () => {
  it("sends edit request with correct params", async () => {
    mockApiResponse({ message_id: 42 });

    await editMessageText(opts, 42, "Updated text");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.chat_id).toBe(CHAT_ID);
    expect(body.message_id).toBe(42);
    expect(body.text).toBe("Updated text");
    expect(body.parse_mode).toBe("HTML");
  });
});

describe("sendInlineKeyboard", () => {
  it("sends message with inline keyboard", async () => {
    mockApiResponse({ message_id: 50 });

    const keyboard = [
      [
        { text: "Upgrade", url: "https://ghali.ae/upgrade" },
        { text: "Help", callback_data: "help" },
      ],
    ];

    const messageId = await sendInlineKeyboard(opts, "Choose an option:", keyboard);

    expect(messageId).toBe(50);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.reply_markup.inline_keyboard).toEqual(keyboard);
    expect(body.text).toBe("Choose an option:");
  });
});

describe("answerCallbackQuery", () => {
  it("answers callback query", async () => {
    mockApiResponse({});

    await answerCallbackQuery(BOT_TOKEN, "query_123", "Done!", false);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.callback_query_id).toBe("query_123");
    expect(body.text).toBe("Done!");
    expect(body.show_alert).toBe(false);
  });
});
