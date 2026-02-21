import type { Metadata } from "next";
import {
  SignedIn,
  SignedOut,
  SignIn,
  PricingTable,
} from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Upgrade to Ghali Pro",
  description: "Choose your Ghali plan — 600 credits/month, deep reasoning, and more.",
};

export default function UpgradePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <SignedOut>
        <h1 className="text-2xl font-bold">Sign in to upgrade</h1>
        <p className="text-muted-foreground">
          Sign in with the phone number you use on WhatsApp.
        </p>
        <SignIn routing="hash" />
      </SignedOut>
      <SignedIn>
        <h1 className="text-2xl font-bold">Choose your plan</h1>
        <PricingTable />
      </SignedIn>
    </div>
  );
}
