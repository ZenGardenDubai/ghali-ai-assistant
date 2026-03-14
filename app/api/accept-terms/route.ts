import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const FETCH_TIMEOUT_MS = 10_000;

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

  try {
    // Get the user's phone number from Clerk
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkUserId);

    // Find a verified phone number — check primary first, then fall back to any verified phone
    const primaryPhone = clerkUser.primaryPhoneNumberId
      ? clerkUser.phoneNumbers.find((p) => p.id === clerkUser.primaryPhoneNumberId)
      : undefined;
    const verifiedPhone =
      primaryPhone?.verification?.status === "verified"
        ? primaryPhone
        : clerkUser.phoneNumbers.find((p) => p.verification?.status === "verified");

    if (!verifiedPhone?.phoneNumber) {
      return NextResponse.json(
        { success: false, error: "No verified phone number found on your account" },
        { status: 400 }
      );
    }

    // Get email if available
    const primaryEmail = clerkUser.primaryEmailAddressId
      ? clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      : clerkUser.emailAddresses[0];

    // Call Convex to record acceptance
    const response = await fetch(`${CONVEX_SITE_URL}/accept-terms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({
        phone: verifiedPhone.phoneNumber,
        clerkUserId,
        email: primaryEmail?.emailAddress,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const raw = await response.text();
    let result: { success?: boolean; error?: string };
    try {
      result = raw ? JSON.parse(raw) : {};
    } catch {
      // Log the raw body server-side but never echo it to the client
      console.error("accept-terms: non-JSON upstream response:", response.status, raw);
      result = { success: false };
    }

    if (!response.ok || !result.success) {
      console.error("accept-terms failed:", response.status, result.error);
      // For 5xx or non-JSON responses, return a safe generic message
      const clientError = response.status >= 500 || !result.error
        ? "Failed to record acceptance. Please try again."
        : result.error;
      return NextResponse.json(
        { success: false, error: clientError },
        { status: response.ok ? 400 : response.status }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return NextResponse.json(
        { success: false, error: "Request timed out. Please try again." },
        { status: 504 }
      );
    }
    console.error("Failed to accept terms:", err);
    return NextResponse.json(
      { success: false, error: "Failed to record acceptance. Please try again." },
      { status: 500 }
    );
  }
}
