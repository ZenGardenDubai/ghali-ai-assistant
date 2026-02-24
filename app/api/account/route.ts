import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!CONVEX_SITE_URL || !INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${CONVEX_SITE_URL}/account-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({ clerkUserId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch account data" }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    console.error("Account data fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
