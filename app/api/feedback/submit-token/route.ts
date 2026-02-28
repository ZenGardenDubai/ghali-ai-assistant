import { NextRequest, NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

export async function POST(req: NextRequest) {
  if (!CONVEX_SITE_URL) {
    return NextResponse.json({ success: false, error: "config_error" }, { status: 500 });
  }

  let body: { token: string; category: string; message: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.token || !body.category || !body.message) {
    return NextResponse.json({ success: false, error: "Missing token, category, or message" }, { status: 400 });
  }

  const VALID_CATEGORIES = ["bug", "feature_request", "general"];
  if (!VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ success: false, error: "Invalid category" }, { status: 400 });
  }

  try {
    const response = await fetch(`${CONVEX_SITE_URL}/feedback/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: body.token,
        category: body.category,
        message: body.message,
      }),
    });

    let result;
    try {
      result = await response.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "upstream_error" },
        { status: 502 }
      );
    }
    return NextResponse.json(result, { status: response.status });
  } catch (err) {
    console.error("Token feedback submit error:", err);
    return NextResponse.json({ success: false, error: "internal_error" }, { status: 500 });
  }
}
