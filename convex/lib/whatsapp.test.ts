import { describe, it, expect } from "vitest";
import {
  validateWebhookSignature,
  parseCloudApiWebhook,
  buildTypingIndicatorPayload,
  inferMimeTypeFromFilename,
} from "./whatsapp";
import { createHmac } from "crypto";

function makeSignature(secret: string, body: string): string {
  return (
    "sha256=" +
    createHmac("sha256", secret).update(body, "utf-8").digest("hex")
  );
}

describe("validateWebhookSignature", () => {
  const secret = "test_webhook_secret_12345";
  const body = JSON.stringify({ object: "whatsapp_business_account" });

  it("accepts valid signature", async () => {
    const signature = makeSignature(secret, body);
    expect(
      await validateWebhookSignature(secret, signature, body)
    ).toBe(true);
  });

  it("rejects invalid signature", async () => {
    expect(
      await validateWebhookSignature(secret, "sha256=invalid", body)
    ).toBe(false);
  });

  it("rejects missing sha256= prefix", async () => {
    expect(
      await validateWebhookSignature(secret, "invalid", body)
    ).toBe(false);
  });

  it("rejects empty signature", async () => {
    expect(
      await validateWebhookSignature(secret, "", body)
    ).toBe(false);
  });
});

describe("parseCloudApiWebhook", () => {
  it("parses text message", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                contacts: [
                  { profile: { name: "Ahmad" }, wa_id: "971501234567" },
                ],
                messages: [
                  {
                    from: "971501234567",
                    id: "wamid.abc123",
                    timestamp: "1234567890",
                    type: "text",
                    text: { body: "Hello Ghali" },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const messages = parseCloudApiWebhook(payload);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      from: "+971501234567",
      body: "Hello Ghali",
      profileName: "Ahmad",
      mediaId: undefined,
      mediaContentType: undefined,
      hasMedia: false,
      messageId: "wamid.abc123",
      quotedMessageId: undefined,
    });
  });

  it("parses image message with caption", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                contacts: [
                  { profile: { name: "Ahmad" }, wa_id: "971501234567" },
                ],
                messages: [
                  {
                    from: "971501234567",
                    id: "wamid.img456",
                    timestamp: "1234567890",
                    type: "image",
                    image: {
                      id: "MEDIA_ID_123",
                      mime_type: "image/jpeg",
                      caption: "Check this out",
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const messages = parseCloudApiWebhook(payload);
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe("Check this out");
    expect(messages[0].mediaId).toBe("MEDIA_ID_123");
    expect(messages[0].mediaContentType).toBe("image/jpeg");
    expect(messages[0].hasMedia).toBe(true);
  });

  it("parses audio message (voice note)", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                contacts: [
                  { profile: { name: "Ahmad" }, wa_id: "971501234567" },
                ],
                messages: [
                  {
                    from: "971501234567",
                    id: "wamid.audio789",
                    timestamp: "1234567890",
                    type: "audio",
                    audio: {
                      id: "MEDIA_ID_456",
                      mime_type: "audio/ogg",
                      voice: true,
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const messages = parseCloudApiWebhook(payload);
    expect(messages).toHaveLength(1);
    expect(messages[0].mediaContentType).toBe("audio/ogg");
    expect(messages[0].body).toBe("");
    expect(messages[0].hasMedia).toBe(true);
  });

  it("parses reply with context", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                contacts: [
                  { profile: { name: "Ahmad" }, wa_id: "971501234567" },
                ],
                messages: [
                  {
                    from: "971501234567",
                    id: "wamid.reply111",
                    timestamp: "1234567890",
                    type: "text",
                    text: { body: "What about this?" },
                    context: {
                      from: "971542022073",
                      id: "wamid.original000",
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const messages = parseCloudApiWebhook(payload);
    expect(messages).toHaveLength(1);
    expect(messages[0].messageId).toBe("wamid.reply111");
    expect(messages[0].quotedMessageId).toBe("wamid.original000");
  });

  it("returns empty for status updates", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  { id: "wamid.xxx", status: "delivered", timestamp: "123" },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const messages = parseCloudApiWebhook(payload);
    expect(messages).toHaveLength(0);
  });

  it("returns empty for non-whatsapp object", () => {
    const payload = { object: "something_else" };
    const messages = parseCloudApiWebhook(payload);
    expect(messages).toHaveLength(0);
  });

  it("adds + prefix to phone numbers", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                contacts: [],
                messages: [
                  {
                    from: "447911123456",
                    id: "wamid.uk",
                    timestamp: "123",
                    type: "text",
                    text: { body: "Hi" },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const messages = parseCloudApiWebhook(payload);
    expect(messages[0].from).toBe("+447911123456");
  });

  it("skips reaction messages", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                contacts: [],
                messages: [
                  {
                    from: "971501234567",
                    id: "wamid.react",
                    timestamp: "123",
                    type: "reaction",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const messages = parseCloudApiWebhook(payload);
    expect(messages).toHaveLength(0);
  });
});

describe("inferMimeTypeFromFilename", () => {
  it("infers text/csv from .csv", () => {
    expect(inferMimeTypeFromFilename("data.csv")).toBe("text/csv");
  });

  it("infers docx MIME from .docx", () => {
    expect(inferMimeTypeFromFilename("report.docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("infers pptx MIME from .pptx", () => {
    expect(inferMimeTypeFromFilename("slides.pptx")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
  });

  it("infers xlsx MIME from .xlsx", () => {
    expect(inferMimeTypeFromFilename("sheet.xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("infers text/plain from .txt", () => {
    expect(inferMimeTypeFromFilename("notes.txt")).toBe("text/plain");
  });

  it("infers application/json from .json", () => {
    expect(inferMimeTypeFromFilename("config.json")).toBe("application/json");
  });

  it("infers application/pdf from .pdf", () => {
    expect(inferMimeTypeFromFilename("document.pdf")).toBe("application/pdf");
  });

  it("returns null for unknown extension", () => {
    expect(inferMimeTypeFromFilename("file.xyz")).toBeNull();
  });

  it("returns null when no extension", () => {
    expect(inferMimeTypeFromFilename("noextension")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(inferMimeTypeFromFilename("DATA.CSV")).toBe("text/csv");
    expect(inferMimeTypeFromFilename("Report.DOCX")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });
});

describe("parseCloudApiWebhook — document MIME inference", () => {
  function makeDocumentPayload(mimeType: string | undefined, filename: string | undefined) {
    return {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                contacts: [{ profile: { name: "Ahmad" }, wa_id: "971501234567" }],
                messages: [
                  {
                    from: "971501234567",
                    id: "wamid.doc001",
                    timestamp: "1234567890",
                    type: "document",
                    document: {
                      id: "MEDIA_DOC_001",
                      mime_type: mimeType ?? "",
                      filename,
                      caption: "Please analyze this",
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
  }

  it("infers text/csv when mime_type is application/octet-stream and filename is .csv", () => {
    const messages = parseCloudApiWebhook(makeDocumentPayload("application/octet-stream", "sales.csv"));
    expect(messages[0].mediaContentType).toBe("text/csv");
  });

  it("infers docx MIME when mime_type is application/octet-stream and filename is .docx", () => {
    const messages = parseCloudApiWebhook(makeDocumentPayload("application/octet-stream", "report.docx"));
    expect(messages[0].mediaContentType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("infers xlsx MIME when mime_type is application/octet-stream and filename is .xlsx", () => {
    const messages = parseCloudApiWebhook(makeDocumentPayload("application/octet-stream", "data.xlsx"));
    expect(messages[0].mediaContentType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("keeps provided MIME when it is not application/octet-stream", () => {
    const messages = parseCloudApiWebhook(makeDocumentPayload(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "report.docx"
    ));
    expect(messages[0].mediaContentType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("keeps application/octet-stream when filename extension is unknown", () => {
    const messages = parseCloudApiWebhook(makeDocumentPayload("application/octet-stream", "archive.zip"));
    expect(messages[0].mediaContentType).toBe("application/octet-stream");
  });

  it("infers MIME when mime_type is missing and filename is .csv", () => {
    const messages = parseCloudApiWebhook(makeDocumentPayload(undefined, "export.csv"));
    expect(messages[0].mediaContentType).toBe("text/csv");
  });
});

describe("buildTypingIndicatorPayload", () => {
  it("produces correct payload shape for a given message ID", () => {
    const payload = buildTypingIndicatorPayload("wamid.abc123");
    expect(payload).toEqual({
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.abc123",
      typing_indicator: { type: "text" },
    });
  });

  it("includes the exact message ID provided", () => {
    const messageId = "wamid.HBgM971501234567VjIyBAAGHiQA1234";
    const payload = buildTypingIndicatorPayload(messageId);
    expect(payload.message_id).toBe(messageId);
  });

  it("always sets status to read", () => {
    const payload = buildTypingIndicatorPayload("wamid.test");
    expect(payload.status).toBe("read");
  });

  it("always sets typing_indicator type to text", () => {
    const payload = buildTypingIndicatorPayload("wamid.test");
    expect((payload.typing_indicator as { type: string }).type).toBe("text");
  });
});
