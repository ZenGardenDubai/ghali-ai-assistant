import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Link a Clerk user to a Telegram user in Convex.
 * Called after Clerk sign-up in the Telegram Mini App upgrade flow.
 * Requires: Clerk auth + telegramId in body.
 */
export async function POST(request: Request) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  if (!CONVEX_SITE_URL || !INTERNAL_API_SECRET) {
    console.error("CONVEX_SITE_URL or INTERNAL_API_SECRET not set");
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: { telegramId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  if (!body.telegramId || typeof body.telegramId !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing telegramId" },
      { status: 400 }
    );
  }

  // Telegram chat IDs are numeric (int64)
  if (!/^\d+$/.test(body.telegramId)) {
    return NextResponse.json(
      { success: false, error: "Invalid telegramId format" },
      { status: 400 }
    );
  }

  // Get email from Clerk user if available
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.length > 0
    ? (clerkUser.primaryEmailAddressId
        ? clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
        : clerkUser.emailAddresses[0])
    : null;

  try {
    const payload: { telegramId: string; clerkUserId: string; email?: string } = {
      telegramId: body.telegramId,
      clerkUserId,
    };
    if (primaryEmail?.emailAddress) {
      payload.email = primaryEmail.emailAddress;
    }

    const response = await fetch(`${CONVEX_SITE_URL}/link-telegram`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("link-telegram HTTP endpoint failed:", response.status);
      return NextResponse.json(
        { success: false, error: "Failed to link account. Please try again." },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to link telegram:", err);
    return NextResponse.json(
      { success: false, error: "Failed to link account. Please try again." },
      { status: 500 }
    );
  }
}
