import { describe, it, expect } from "vitest";
import {
  validateWebhookSignature,
  parseCloudApiWebhook,
  parseCloudApiStatuses,
  buildTypingIndicatorPayload,
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
                  { id: "wamid.xxx", status: "delivered" as const, timestamp: "123", recipient_id: "971501234567" },
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

  it("infers MIME type from filename when document has application/octet-stream", () => {
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
                    id: "wamid.csv1",
                    timestamp: "123",
                    type: "document",
                    document: {
                      id: "MEDIA_CSV",
                      mime_type: "application/octet-stream",
                      filename: "data.csv",
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
    expect(messages[0].mediaContentType).toBe("text/csv");
  });

  it("infers MIME type from filename when document mime_type is missing", () => {
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
                    id: "wamid.docx1",
                    timestamp: "123",
                    type: "document",
                    document: {
                      id: "MEDIA_DOCX",
                      filename: "report.docx",
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
    expect(messages[0].mediaContentType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("keeps original MIME type when it is specific (not octet-stream)", () => {
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
                    id: "wamid.pdf1",
                    timestamp: "123",
                    type: "document",
                    document: {
                      id: "MEDIA_PDF",
                      mime_type: "application/pdf",
                      filename: "report.pdf",
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
    expect(messages[0].mediaContentType).toBe("application/pdf");
  });

  it("falls back to octet-stream when filename has unknown extension", () => {
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
                    id: "wamid.zip1",
                    timestamp: "123",
                    type: "document",
                    document: {
                      id: "MEDIA_ZIP",
                      mime_type: "application/octet-stream",
                      filename: "archive.zip",
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
    expect(messages[0].mediaContentType).toBe("application/octet-stream");
  });

  it("falls back to octet-stream when filename is missing", () => {
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
                    id: "wamid.noname",
                    timestamp: "123",
                    type: "document",
                    document: {
                      id: "MEDIA_NONAME",
                      mime_type: "application/octet-stream",
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
    expect(messages[0].mediaContentType).toBe("application/octet-stream");
  });
});

describe("parseCloudApiStatuses", () => {
  it("parses delivered status", () => {
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
                  {
                    id: "wamid.xxx",
                    status: "delivered",
                    timestamp: "1700000000",
                    recipient_id: "971501234567",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const statuses = parseCloudApiStatuses(payload);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toEqual({
      recipientPhone: "+971501234567",
      status: "delivered",
      timestamp: 1700000000000,
      isBlocked: false,
      errorCode: undefined,
      errorMessage: undefined,
    });
  });

  it("parses read status", () => {
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
                  {
                    id: "wamid.xxx",
                    status: "read",
                    timestamp: "1700000100",
                    recipient_id: "971501234567",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const statuses = parseCloudApiStatuses(payload);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].status).toBe("read");
    expect(statuses[0].isBlocked).toBe(false);
  });

  it("detects blocked user from error code 131049", () => {
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
                  {
                    id: "wamid.xxx",
                    status: "failed",
                    timestamp: "1700000200",
                    recipient_id: "971501234567",
                    errors: [
                      {
                        code: 131049,
                        title: "Message failed because user blocked the business",
                      },
                    ],
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const statuses = parseCloudApiStatuses(payload);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].isBlocked).toBe(true);
    expect(statuses[0].errorCode).toBe(131049);
    expect(statuses[0].status).toBe("failed");
  });

  it("does not flag session-expiry error 131047 as blocked", () => {
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
                  {
                    id: "wamid.xxx",
                    status: "failed",
                    timestamp: "1700000300",
                    recipient_id: "971501234567",
                    errors: [{ code: 131047, title: "Re-engagement message" }],
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const statuses = parseCloudApiStatuses(payload);
    expect(statuses[0].isBlocked).toBe(false);
    expect(statuses[0].errorCode).toBe(131047);
  });

  it("detects blocked user from error code 131026", () => {
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
                  {
                    id: "wamid.xxx",
                    status: "failed",
                    timestamp: "1700000350",
                    recipient_id: "971501234567",
                    errors: [{ code: 131026, title: "Message undeliverable" }],
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const statuses = parseCloudApiStatuses(payload);
    expect(statuses[0].isBlocked).toBe(true);
    expect(statuses[0].errorCode).toBe(131026);
  });

  it("does not flag non-block error codes as blocked", () => {
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
                  {
                    id: "wamid.xxx",
                    status: "failed",
                    timestamp: "1700000400",
                    recipient_id: "971501234567",
                    errors: [{ code: 500, title: "Internal server error" }],
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const statuses = parseCloudApiStatuses(payload);
    expect(statuses[0].isBlocked).toBe(false);
    expect(statuses[0].errorCode).toBe(500);
  });

  it("skips 'sent' statuses", () => {
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
                  {
                    id: "wamid.xxx",
                    status: "sent",
                    timestamp: "1700000500",
                    recipient_id: "971501234567",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const statuses = parseCloudApiStatuses(payload);
    expect(statuses).toHaveLength(0);
  });

  it("returns empty for non-whatsapp object", () => {
    const payload = { object: "something_else" };
    const statuses = parseCloudApiStatuses(payload);
    expect(statuses).toHaveLength(0);
  });

  it("returns empty when no statuses present", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                messages: [
                  {
                    from: "971501234567",
                    id: "wamid.msg",
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

    const statuses = parseCloudApiStatuses(payload);
    expect(statuses).toHaveLength(0);
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
