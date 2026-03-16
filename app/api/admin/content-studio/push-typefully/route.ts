import { NextRequest, NextResponse } from "next/server";
import { adminConvexFetch } from "../../_lib/auth";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  return adminConvexFetch("/admin/content-studio/push-typefully", body);
}
