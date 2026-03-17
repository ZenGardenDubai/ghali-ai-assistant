import { NextResponse } from "next/server";
import { verifyInitData } from "@/app/lib/telegram-auth";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

const VALID_CATEGORIES = new Set(["bug", "feature_request", "general"]);

export async function POST(request: Request) {
  if (!BOT_TOKEN || !CONVEX_URL || !INTERNAL_API_SECRET) {
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

  // Verify initData directly (no network call)
  const verified = await verifyInitData(body.initData, BOT_TOKEN);
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid Telegram identity" },
      { status: 401 }
    );
  }

  // Forward to Convex
  const convexSiteUrl = CONVEX_URL.replace(".cloud", ".site");
  const convexRes = await fetch(`${convexSiteUrl}/tg-feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INTERNAL_API_SECRET}`,
    },
    body: JSON.stringify({
      telegramId: verified.telegramId,
      category: body.category,
      message: body.message,
    }),
  });

  const result = await convexRes.json();
  return NextResponse.json(result, { status: convexRes.status });
}
