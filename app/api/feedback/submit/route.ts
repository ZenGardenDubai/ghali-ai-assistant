import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!CONVEX_SITE_URL || !INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { category: string; message: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.category || !body.message) {
    return NextResponse.json({ error: "Missing category or message" }, { status: 400 });
  }

  // Get phone from Clerk
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkUserId);

  const primaryPhone = clerkUser.primaryPhoneNumberId
    ? clerkUser.phoneNumbers.find((p) => p.id === clerkUser.primaryPhoneNumberId)
    : clerkUser.phoneNumbers[0];

  if (!primaryPhone?.phoneNumber) {
    return NextResponse.json(
      { error: "No phone number found on your account" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${CONVEX_SITE_URL}/feedback/submit-web`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({
        phone: primaryPhone.phoneNumber,
        category: body.category,
        message: body.message,
      }),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (err) {
    console.error("Feedback submit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
