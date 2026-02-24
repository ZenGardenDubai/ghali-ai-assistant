"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminSignInPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Already signed in — redirect to account page
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/account");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show blank page while Clerk is loading to prevent sign-in form flash
  if (!isLoaded) {
    return <div className="min-h-screen bg-[#0a0f1e]" />;
  }

  // Signed in — render nothing while redirect fires
  if (isSignedIn) {
    return <div className="min-h-screen bg-[#0a0f1e]" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e]">
      <SignIn
        forceRedirectUrl="/account"
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
