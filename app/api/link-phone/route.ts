import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
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
    const result = await convex.mutation(api.billing.linkClerkUserByPhone, {
      phone: primaryPhone.phoneNumber,
      clerkUserId,
      email: primaryEmail?.emailAddress,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to link phone:", err);
    return NextResponse.json(
      { success: false, error: "Failed to link account. Please try again." },
      { status: 500 }
    );
  }
}
