import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Verify Telegram Mini App initData using HMAC-SHA256.
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Returns verified telegramId on success, 401 on failure.
 */
export async function POST(request: Request) {
  if (!BOT_TOKEN) {
    console.error("[tg-auth] TELEGRAM_BOT_TOKEN not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: { initData: string };
  try {
    const parsed = await request.json();
    if (typeof parsed?.initData !== "string") {
      return NextResponse.json({ error: "Invalid initData type" }, { status: 400 });
    }
    body = parsed as { initData: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.initData) {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 });
  }

  const verified = await verifyInitData(body.initData, BOT_TOKEN);
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  return NextResponse.json({
    telegramId: verified.telegramId,
    firstName: verified.firstName,
  });
}

async function verifyInitData(
  initData: string,
  botToken: string
): Promise<{ telegramId: string; firstName?: string } | null> {
  try {
    // Parse URL-encoded initData
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    // Check auth_date is not too old (5 minutes)
    const authDate = params.get("auth_date");
    if (!authDate) return null;
    const authTimestamp = parseInt(authDate, 10);
    if (isNaN(authTimestamp)) return null;
    if (Math.abs(Date.now() / 1000 - authTimestamp) > 300) return null;

    // Build data-check-string: sort all fields except hash, join with \n
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretHash = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      encoder.encode(botToken)
    );

    // computed_hash = HMAC-SHA256(secret_key, data_check_string)
    const dataKey = await crypto.subtle.importKey(
      "raw",
      secretHash,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const computedHash = await crypto.subtle.sign(
      "HMAC",
      dataKey,
      encoder.encode(dataCheckString)
    );

    // Constant-time hash comparison to prevent timing attacks
    const computedBytes = new Uint8Array(computedHash);
    const hashBytes = new Uint8Array(
      (hash.match(/.{2}/g) ?? []).map((byte) => parseInt(byte, 16))
    );
    if (computedBytes.length !== hashBytes.length) return null;
    let mismatch = 0;
    for (let i = 0; i < computedBytes.length; i++) {
      mismatch |= computedBytes[i] ^ hashBytes[i];
    }
    if (mismatch !== 0) return null;

    // Extract user info
    const userJson = params.get("user");
    if (!userJson) return null;
    const user = JSON.parse(userJson);

    return {
      telegramId: String(user.id),
      firstName: user.first_name,
    };
  } catch (error) {
    console.error("[tg-auth] Verification error:", error);
    return null;
  }
}
