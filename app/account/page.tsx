"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

const WHATSAPP_URL = "https://wa.me/971582896090?text=Hi%20Ghali";

export default function AccountPage() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const isAdmin =
    isLoaded &&
    isSignedIn &&
    user &&
    (user.publicMetadata as Record<string, unknown>)?.isAdmin === true;

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/auth/admin-sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <div className="min-h-screen bg-[#0a0f1e]" />;
  }

  if (!isSignedIn) {
    return null;
  }

  const identifier =
    user?.primaryPhoneNumber?.phoneNumber ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.fullName ||
    "there";

  return (
    <div className="relative min-h-screen bg-[#0a0f1e] text-white">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Orange glow */}
      <div className="pointer-events-none fixed top-1/3 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ED6B23]/8 blur-[140px]" />

      <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md space-y-6">

          {/* Header */}
          <div className="text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ED6B23]/10 border border-[#ED6B23]/20">
              <span className="text-2xl">🤖</span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-white">
              Ghali
            </h1>
            <p className="mt-2 text-sm text-white/40">
              Signed in as{" "}
              <span className="text-white/60">{identifier}</span>
            </p>
          </div>

          {/* Action cards */}
          <div className="space-y-3">

            {/* Manage Subscription */}
            <Link
              href="/upgrade"
              className="group flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all hover:border-[#ED6B23]/30 hover:bg-[#ED6B23]/5"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#ED6B23]/10 border border-[#ED6B23]/20 text-xl transition-colors group-hover:bg-[#ED6B23]/20">
                💳
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">Manage Subscription</p>
                <p className="mt-0.5 text-sm text-white/40">
                  View plans, upgrade to Pro, or manage billing
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/20 transition-colors group-hover:text-[#ED6B23]/60" />
            </Link>

            {/* Admin Dashboard — only for admins */}
            {isAdmin && (
              <Link
                href="/admin"
                className="group flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all hover:border-white/20 hover:bg-white/[0.06]"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] text-xl transition-colors group-hover:bg-white/[0.1]">
                  ⚙️
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">Admin Dashboard</p>
                  <p className="mt-0.5 text-sm text-white/40">
                    Users, stats, templates, and system settings
                  </p>
                </div>
                <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/20 transition-colors group-hover:text-white/40" />
              </Link>
            )}

            {/* Back to WhatsApp */}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] text-xl transition-colors group-hover:bg-white/[0.1]">
                💬
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">Open WhatsApp</p>
                <p className="mt-0.5 text-sm text-white/40">
                  Chat with Ghali on WhatsApp
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/20 transition-colors group-hover:text-white/40" />
            </a>
          </div>

          {/* Sign out */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="text-sm text-white/30 transition-colors hover:text-white/60"
            >
              Sign out
            </button>
            <span className="text-white/10">·</span>
            <Link
              href="/"
              className="text-sm text-white/30 transition-colors hover:text-white/60"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
