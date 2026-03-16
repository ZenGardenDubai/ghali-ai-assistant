import { NextRequest } from "next/server";
import { adminConvexFetch } from "../../../_lib/auth";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body is ok
  }
  return adminConvexFetch("/admin/content-studio/feature-queue", body);
}
