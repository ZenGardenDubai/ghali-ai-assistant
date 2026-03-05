import { NextRequest, NextResponse } from "next/server";
import { adminConvexFetch } from "../_lib/auth";

export async function GET() {
  return adminConvexFetch("/admin/onboarding-config", {});
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  return adminConvexFetch("/admin/onboarding-config", {
    action: "save",
    ...body,
  });
}

export async function DELETE() {
  return adminConvexFetch("/admin/onboarding-config", {
    action: "delete",
  });
}
