import { NextResponse } from "next/server";
import { verifyInitData } from "@/app/lib/telegram-auth";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

const MAX_MESSAGE_LENGTH = 2000;

const VALID_CATEGORIES = new Set(["bug", "feature_request", "general"]);

export async function POST(request: Request) {
  if (!BOT_TOKEN || !CONVEX_SITE_URL || !INTERNAL_API_SECRET) {
    console.error("[tg-feedback] Missing required env vars");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: { initData: string; category: string; message: string };
  try {
    const parsed = await request.json();
    if (
      typeof parsed?.initData !== "string" ||
      typeof parsed?.category !== "string" ||
      typeof parsed?.message !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing initData, category, or message" },
        { status: 400 }
      );
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!VALID_CATEGORIES.has(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (!body.message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  // Dev mode: accept telegramId directly (tree-shaken in production builds)
  let telegramId: string;
  if (process.env.NODE_ENV === "development" && body.initData === "dev_mode" && (body as Record<string, unknown>).devTelegramId) {
    telegramId = String((body as Record<string, unknown>).devTelegramId);
  } else {
    // Verify initData directly (30-min window — user may spend time writing feedback)
    const verified = await verifyInitData(body.initData, BOT_TOKEN, 1800);
    if (!verified) {
      return NextResponse.json(
        { error: "Invalid Telegram identity" },
        { status: 401 }
      );
    }
    telegramId = verified.telegramId;
  }

  // Forward to Convex
  const convexRes = await fetch(`${CONVEX_SITE_URL}/tg-feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INTERNAL_API_SECRET}`,
    },
    body: JSON.stringify({
      telegramId,
      category: body.category,
      message: body.message,
    }),
  });

  try {
    const result = await convexRes.json();
    return NextResponse.json(result, { status: convexRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 502 }
    );
  }
}
