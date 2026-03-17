import { NextResponse } from "next/server";
import { verifyInitData } from "@/app/lib/telegram-auth";

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
