"use client";

import { SignIn, useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

export default function AdminSignInPage() {
  const { isSignedIn, signOut, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // Already signed in as admin — redirect to /admin
  const isAdmin = isLoaded && isSignedIn && user && (user.publicMetadata as Record<string, unknown>)?.isAdmin === true;
  useEffect(() => {
    if (isLoaded && isAdmin) {
      router.replace("/admin");
    }
  }, [isLoaded, isAdmin, router]);

  // Show blank page while Clerk is loading to prevent sign-in form flash
  if (!isLoaded) {
    return <div className="min-h-screen bg-[#0a0f1e]" />;
  }

  // Already signed in but not admin — show message with sign-out option
  if (isSignedIn && user && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e]">
        <div className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#0d1225]/90 p-8 text-center backdrop-blur-xl shadow-2xl">
          <h2 className="text-lg font-semibold text-white">Access Denied</h2>
          <p className="mt-2 text-sm text-white/50">
            You&apos;re signed in as <span className="text-white/70">{user.primaryPhoneNumber?.phoneNumber || user.primaryEmailAddress?.emailAddress}</span> but this account doesn&apos;t have admin access.
          </p>
          <button
            onClick={() => signOut({ redirectUrl: "/auth/admin-sign-in" })}
            className="mt-6 w-full rounded-lg bg-[#ED6B23] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#ED6B23]/90 transition-colors"
          >
            Sign out and try another account
          </button>
          <Link
            href="/"
            className="mt-3 block text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e]">
      <SignIn
        forceRedirectUrl="/admin"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            cardBox: "border border-white/[0.08] bg-[#0d1225]/90 shadow-2xl backdrop-blur-xl",
            card: "bg-transparent shadow-none",
            headerTitle: "text-white",
            headerSubtitle: "text-white/50",
            socialButtonsBlockButton: "border-white/[0.1] bg-white/[0.04] text-white/70 hover:bg-white/[0.08]",
            formFieldLabel: "text-white/60",
            formFieldInput: "border-white/[0.1] bg-white/[0.04] text-white placeholder:text-white/25",
            formButtonPrimary: "bg-[#ED6B23] hover:bg-[#ED6B23]/90",
            footerActionLink: "text-[#ED6B23] hover:text-[#ED6B23]/80",
            identityPreview: "bg-white/[0.04] border-white/[0.08]",
            identityPreviewText: "text-white/70",
            identityPreviewEditButton: "text-[#ED6B23]",
          },
        }}
      />
    </div>
  );
}
