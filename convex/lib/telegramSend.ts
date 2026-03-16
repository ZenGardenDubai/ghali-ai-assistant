/**
 * Telegram Bot API outbound message sending.
 * Used as a Convex action since it needs HTTP access.
 *
 * All methods call https://api.telegram.org directly (not the local Bot API
 * server, which is only accessible on the bot server machine).
 */
import { splitForTelegram, formatForTelegram } from "./telegram";
import { TELEGRAM_MESSAGE_DELAY_MS, TELEGRAM_MAX_CHUNKS } from "../constants";

const TELEGRAM_API_BASE = "https://api.telegram.org";

interface TelegramSendOptions {
  botToken: string;
  chatId: string; // Telegram chat ID (int64 as string)
}

interface TelegramApiResponse {
  ok: boolean;
  result?: Record<string, unknown>;
  description?: string;
  error_code?: number;
}

/**
 * Base HTTP call to the Telegram Bot API.
 * Returns the parsed response, throws on network errors.
 */
export async function telegramApiCall(
  botToken: string,
  method: string,
  body: Record<string, unknown>
): Promise<TelegramApiResponse> {
  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = (await response.json()) as TelegramApiResponse;

  if (!data.ok) {
    throw new Error(
      `Telegram API error (${data.error_code}): ${data.description} [method: ${method}]`
    );
  }

  return data;
}

/**
 * Send a text message via Telegram Bot API.
 * Formats markdown to HTML, splits into chunks if needed.
 * Returns the message_id of the last sent message.
 */
export async function sendTelegramMessage(
  options: TelegramSendOptions,
  body: string
): Promise<number | undefined> {
  // Split BEFORE formatting to avoid breaking HTML tags across chunks.
  // Each chunk is formatted independently so tags are always balanced.
  const rawChunks = splitForTelegram(body);
  const chunks = rawChunks.map(formatForTelegram);

  // Defense-in-depth: hard cap on chunks
  if (chunks.length > TELEGRAM_MAX_CHUNKS) {
    console.error(
      `[telegramSend] CRITICAL: ${chunks.length} chunks exceed TELEGRAM_MAX_CHUNKS (${TELEGRAM_MAX_CHUNKS}). ` +
        `Truncating to prevent message flood. Original length: ${body.length} chars`
    );
    chunks.length = TELEGRAM_MAX_CHUNKS;
  }

  let lastMessageId: number | undefined;

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, TELEGRAM_MESSAGE_DELAY_MS));
    }
    const result = await telegramApiCall(options.botToken, "sendMessage", {
      chat_id: options.chatId,
      text: chunks[i],
      parse_mode: "HTML",
    });
    lastMessageId = (result.result as Record<string, unknown>)
      ?.message_id as number;
  }

  return lastMessageId;
}

/**
 * Send a pre-formatted HTML message (no markdown conversion).
 * Useful for system messages and templates that are already in HTML.
 * Returns the message_id of the sent message.
 */
export async function sendTelegramHtml(
  options: TelegramSendOptions,
  html: string
): Promise<number | undefined> {
  const result = await telegramApiCall(options.botToken, "sendMessage", {
    chat_id: options.chatId,
    text: html,
    parse_mode: "HTML",
  });
  return (result.result as Record<string, unknown>)?.message_id as number;
}

/**
 * Send a photo via Telegram Bot API.
 * Accepts a URL or file_id.
 */
export async function sendTelegramPhoto(
  options: TelegramSendOptions,
  photo: string,
  caption?: string
): Promise<number | undefined> {
  const body: Record<string, unknown> = {
    chat_id: options.chatId,
    photo,
  };
  if (caption) {
    body.caption = caption;
    body.parse_mode = "HTML";
  }
  const result = await telegramApiCall(options.botToken, "sendPhoto", body);
  return (result.result as Record<string, unknown>)?.message_id as number;
}

/**
 * Send a document via Telegram Bot API.
 */
export async function sendTelegramDocument(
  options: TelegramSendOptions,
  document: string,
  caption?: string
): Promise<number | undefined> {
  const body: Record<string, unknown> = {
    chat_id: options.chatId,
    document,
  };
  if (caption) {
    body.caption = caption;
    body.parse_mode = "HTML";
  }
  const result = await telegramApiCall(options.botToken, "sendDocument", body);
  return (result.result as Record<string, unknown>)?.message_id as number;
}

/**
 * Send an audio file via Telegram Bot API.
 */
export async function sendTelegramAudio(
  options: TelegramSendOptions,
  audio: string,
  caption?: string
): Promise<number | undefined> {
  const body: Record<string, unknown> = {
    chat_id: options.chatId,
    audio,
  };
  if (caption) {
    body.caption = caption;
    body.parse_mode = "HTML";
  }
  const result = await telegramApiCall(options.botToken, "sendAudio", body);
  return (result.result as Record<string, unknown>)?.message_id as number;
}

/**
 * Send a video via Telegram Bot API.
 */
export async function sendTelegramVideo(
  options: TelegramSendOptions,
  video: string,
  caption?: string
): Promise<number | undefined> {
  const body: Record<string, unknown> = {
    chat_id: options.chatId,
    video,
  };
  if (caption) {
    body.caption = caption;
    body.parse_mode = "HTML";
  }
  const result = await telegramApiCall(options.botToken, "sendVideo", body);
  return (result.result as Record<string, unknown>)?.message_id as number;
}

/**
 * Send a chat action (typing indicator).
 * Action types: "typing", "upload_photo", "upload_document",
 * "upload_audio", "upload_video", "record_voice", etc.
 * Each action displays for ~5 seconds.
 */
export async function sendChatAction(
  options: TelegramSendOptions,
  action: string = "typing"
): Promise<void> {
  try {
    await telegramApiCall(options.botToken, "sendChatAction", {
      chat_id: options.chatId,
      action,
    });
  } catch (error) {
    // Typing indicators are best-effort — don't block on failure
    console.warn("[telegramSend] sendChatAction failed:", error);
  }
}

/**
 * Get file download info from Telegram Bot API.
 * Returns the file path which can be used to construct a download URL.
 */
export async function getTelegramFile(
  botToken: string,
  fileId: string
): Promise<{ filePath: string; fileSize?: number } | null> {
  try {
    const result = await telegramApiCall(botToken, "getFile", {
      file_id: fileId,
    });
    const file = result.result as Record<string, unknown>;
    if (!file?.file_path) return null;
    return {
      filePath: file.file_path as string,
      fileSize: file.file_size as number | undefined,
    };
  } catch (error) {
    console.error("[telegramSend] getFile failed:", error);
    return null;
  }
}

/**
 * Download a file from Telegram by file_id.
 * Calls getFile internally. For cases where you already have file info,
 * use downloadTelegramFileByPath instead to avoid a redundant API call.
 */
export async function downloadTelegramFile(
  botToken: string,
  fileId: string
): Promise<{ data: ArrayBuffer; mimeType: string } | null> {
  const fileInfo = await getTelegramFile(botToken, fileId);
  if (!fileInfo) return null;
  return downloadTelegramFileByPath(botToken, fileInfo.filePath);
}

/**
 * Download a file from Telegram by file path (from a prior getFile call).
 * Avoids redundant getFile API call when file info is already available.
 */
export async function downloadTelegramFileByPath(
  botToken: string,
  filePath: string
): Promise<{ data: ArrayBuffer; mimeType: string } | null> {
  const downloadUrl = `${TELEGRAM_API_BASE}/file/bot${botToken}/${filePath}`;

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      console.error(
        `[telegramSend] File download failed (${response.status}): ${filePath}`
      );
      return null;
    }

    const data = await response.arrayBuffer();
    const mimeType =
      response.headers.get("content-type") ?? inferMimeType(filePath);

    return { data, mimeType };
  } catch (error) {
    console.error("[telegramSend] File download error:", error);
    return null;
  }
}

/**
 * Edit a previously sent message text.
 * Used for streaming/typewriter effect.
 */
export async function editMessageText(
  options: TelegramSendOptions,
  messageId: number,
  text: string,
  parseMode: string = "HTML"
): Promise<void> {
  await telegramApiCall(options.botToken, "editMessageText", {
    chat_id: options.chatId,
    message_id: messageId,
    text,
    parse_mode: parseMode,
  });
}

/**
 * Send a message with an inline keyboard.
 * Returns the message_id of the sent message.
 */
export async function sendInlineKeyboard(
  options: TelegramSendOptions,
  text: string,
  keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>,
  parseMode: string = "HTML"
): Promise<number | undefined> {
  const result = await telegramApiCall(options.botToken, "sendMessage", {
    chat_id: options.chatId,
    text,
    parse_mode: parseMode,
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
  return (result.result as Record<string, unknown>)?.message_id as number;
}

/**
 * Answer a callback query (acknowledge inline button tap).
 * Must be called within 10 seconds of receiving the callback.
 */
export async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<void> {
  await telegramApiCall(botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

/**
 * Infer MIME type from file path/extension.
 * Fallback for when Content-Type header is missing.
 */
function inferMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    wav: "audio/wav",
    flac: "audio/flac",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
  };
  return mimeMap[ext ?? ""] ?? "application/octet-stream";
}
