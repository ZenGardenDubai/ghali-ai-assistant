import { NextResponse } from "next/server";
import { adminConvexFetch } from "../../../_lib/auth";

export async function POST() {
  return adminConvexFetch("/admin/content-studio/stats");
}
