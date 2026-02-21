"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignIn,
  PricingTable,
  useAuth,
} from "@clerk/nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

const TOKEN_STORAGE_KEY = "ghali_upgrade_token";

/**
 * Get upgrade token from URL params or sessionStorage.
 * Persists to sessionStorage so it survives OAuth redirects.
 * Returns: undefined = loading, null = not found, string = found.
 */
function useUpgradeToken() {
  const searchParams = useSearchParams();
  const paramToken = searchParams.get("token");

  // Resolve token synchronously: URL param takes priority, then sessionStorage
  const token = paramToken ?? sessionStorage.getItem(TOKEN_STORAGE_KEY);

  // Persist URL param to sessionStorage so it survives OAuth redirects
  useEffect(() => {
    if (paramToken) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, paramToken);
    }
  }, [paramToken]);

  return token;
}

function UpgradeContent() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const token = useUpgradeToken();
  const { isSignedIn } = useAuth();

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [redeemed, setRedeemed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate token
  useEffect(() => {
    if (!token || isSuccess) return;
    let cancelled = false;

    convex
      .query(api.billing.validateUpgradeToken, { token })
      .then((result) => {
        if (!cancelled) {
          setTokenValid(result.valid);
          if (!result.valid) sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      })
      .catch(() => {
        if (!cancelled) setTokenValid(false);
      });

    return () => { cancelled = true; };
  }, [token, isSuccess]);

  // Redeem token after sign-in via server-verified API route
  useEffect(() => {
    if (!isSignedIn || !token || !tokenValid || redeemed || error) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/redeem-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const result = await res.json();
        if (cancelled) return;
        if (result.success) {
          setRedeemed(true);
          // Clean up stored token after successful redemption
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        } else {
          setError(result.error ?? "Failed to link account");
        }
      } catch {
        if (!cancelled) setError("Something went wrong. Please try again.");
      }
    })();

    return () => { cancelled = true; };
  }, [isSignedIn, token, tokenValid, redeemed, error]);

  if (isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
        <h1 className="text-3xl font-bold">You&apos;re all set!</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Your Pro subscription is active. You now have 600 credits/month,
          deep reasoning, image generation, and more.
        </p>
        <p className="text-muted-foreground">
          Head back to WhatsApp and start chatting with Ghali.
        </p>
        <a
          href="https://wa.me/971582896090"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-[#1DA851]"
        >
          Open WhatsApp
        </a>
      </div>
    );
  }

  // No token found
  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
        <h1 className="text-2xl font-bold">Invalid upgrade link</h1>
        <p className="max-w-md text-muted-foreground">
          Please use the upgrade link sent to you on WhatsApp. Send
          &quot;upgrade&quot; to Ghali to get a new link.
        </p>
        <a
          href="https://wa.me/971582896090"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-[#1DA851]"
        >
          Open WhatsApp
        </a>
      </div>
    );
  }

  // Validating token
  if (tokenValid === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
        <p className="text-muted-foreground">Validating your upgrade link...</p>
      </div>
    );
  }

  // Token invalid or expired
  if (!tokenValid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
        <h1 className="text-2xl font-bold">Link expired</h1>
        <p className="max-w-md text-muted-foreground">
          This upgrade link has expired or already been used. Send
          &quot;upgrade&quot; to Ghali on WhatsApp to get a new link.
        </p>
        <a
          href="https://wa.me/971582896090"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-[#1DA851]"
        >
          Open WhatsApp
        </a>
      </div>
    );
  }

  // Error during redemption
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-md text-muted-foreground">{error}</p>
        <a
          href="https://wa.me/971582896090"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-[#1DA851]"
        >
          Open WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <SignedOut>
        <h1 className="text-2xl font-bold">Sign in to upgrade</h1>
        <p className="text-muted-foreground">
          Sign in with Google to link your account.
        </p>
        <SignIn routing="hash" forceRedirectUrl="/upgrade" />
      </SignedOut>
      <SignedIn>
        {!redeemed ? (
          <p className="text-muted-foreground">Linking your account...</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Choose your plan</h1>
            <PricingTable newSubscriptionRedirectUrl="/upgrade?success=true" />
          </>
        )}
      </SignedIn>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  );
}
