import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST() {
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

  // Get the user's phone number from Clerk
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkUserId);

  // Find the primary phone number (verified via OTP sign-in)
  const primaryPhone = clerkUser.primaryPhoneNumberId
    ? clerkUser.phoneNumbers.find((p) => p.id === clerkUser.primaryPhoneNumberId)
    : clerkUser.phoneNumbers[0];

  if (!primaryPhone?.phoneNumber) {
    return NextResponse.json(
      { success: false, error: "No phone number found on your account" },
      { status: 400 }
    );
  }

  // Get email if available (may be added later during payment)
  const primaryEmail = clerkUser.primaryEmailAddressId
    ? clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
    : clerkUser.emailAddresses[0];

  try {
    const response = await fetch(`${CONVEX_SITE_URL}/link-phone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({
        phone: primaryPhone.phoneNumber,
        clerkUserId,
        email: primaryEmail?.emailAddress,
      }),
    });

    if (!response.ok) {
      console.error("link-phone HTTP endpoint failed:", response.status);
      return NextResponse.json(
        { success: false, error: "Failed to link account. Please try again." },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to link phone:", err);
    return NextResponse.json(
      { success: false, error: "Failed to link account. Please try again." },
      { status: 500 }
    );
  }
}
