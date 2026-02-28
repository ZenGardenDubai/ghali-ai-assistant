import { NextRequest, NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

export async function POST(req: NextRequest) {
  if (!CONVEX_SITE_URL) {
    return NextResponse.json({ valid: false, reason: "config_error" }, { status: 500 });
  }

  let body: { token: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false, reason: "invalid_json" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ valid: false, reason: "missing_token" }, { status: 400 });
  }

  try {
    const response = await fetch(`${CONVEX_SITE_URL}/feedback/validate-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: body.token }),
    });

    let result;
    try {
      result = await response.json();
    } catch {
      return NextResponse.json(
        { valid: false, reason: "upstream_error" },
        { status: 502 }
      );
    }
    return NextResponse.json(result, { status: response.status });
  } catch (err) {
    console.error("Token validation error:", err);
    return NextResponse.json({ valid: false, reason: "internal_error" }, { status: 500 });
  }
}
