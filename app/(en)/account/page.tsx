"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

const TELEGRAM_URL = "https://t.me/GhaliSmartBot";

interface AccountData {
  name?: string;
  phone: string;
  tier: "basic" | "pro";
  credits: number;
  creditsTotal: number;
  creditsResetAt: number;
  subscriptionCanceling: boolean;
  createdAt: number;
}

function formatResetCountdown(resetAt: number): string {
  const diff = resetAt - Date.now();
  if (diff <= 0) return "Resetting soon";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/* ─── Credit Ring (SVG circular gauge) ─────────────── */

function CreditRing({
  credits,
  total,
  tier,
}: {
  credits: number;
  total: number;
  tier: "basic" | "pro";
}) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const percent = total > 0 ? Math.min(credits / total, 1) : 0;

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedPercent(percent), 100);
    return () => clearTimeout(timeout);
  }, [percent]);

  const radius = 80;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - animatedPercent);
  const isPro = tier === "pro";

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Ambient glow behind ring */}
      <div
        className="absolute h-44 w-44 rounded-full blur-[40px] opacity-20"
        style={{ backgroundColor: isPro ? "#ED6B23" : "#6b7280" }}
      />
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className="relative -rotate-90"
      >
        {/* Track */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={isPro ? "#ED6B23" : "#6b7280"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums text-white">
          {credits}
        </span>
        <span className="mt-0.5 text-xs font-medium uppercase tracking-wider text-white/35">
          of {total} credits
        </span>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────── */

export default function AccountPage() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const fetchAccount = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/account", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data) setAccount(data);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) fetchAccount();
  }, [isSignedIn, fetchAccount]);

  if (!isLoaded) {
    return <div className="min-h-screen bg-[#0a0f1e]" />;
  }

  if (!isSignedIn) {
    return null;
  }

  const displayName =
    account?.name ||
    user?.fullName ||
    user?.primaryPhoneNumber?.phoneNumber ||
    "there";

  return (
    <div className="relative min-h-screen bg-[#0a0f1e] text-white overflow-hidden">
      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Ambient glows */}
      <div className="pointer-events-none fixed top-1/4 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ED6B23]/[0.06] blur-[140px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-[#ED6B23]/[0.03] blur-[100px]" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#ED6B23]/20 to-[#ED6B23]/5 ring-1 ring-[#ED6B23]/20 transition-all group-hover:ring-[#ED6B23]/40">
            <Image src="/ghali-logo-no-bg.svg" alt="Ghali" width={22} height={22} />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white/70 group-hover:text-white/90 transition-colors">
            Ghali
          </span>
        </Link>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="text-xs font-medium text-white/30 transition-colors hover:text-white/60"
        >
          Sign out
        </button>
      </header>

      <main className="relative z-10 flex flex-col items-center px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
        <div className="w-full max-w-md space-y-8">

          {/* Greeting */}
          <div className="animate-fade-up text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-white leading-tight">
              Hey, {displayName.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm text-white/35">
              {user?.primaryEmailAddress?.emailAddress ||
                user?.primaryPhoneNumber?.phoneNumber}
            </p>
          </div>

          {/* Credit Ring */}
          <div className="animate-fade-up delay-100 flex flex-col items-center">
            {loading ? (
              <div className="h-[200px] w-[200px] flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ED6B23] border-t-transparent" />
              </div>
            ) : account ? (
              <>
                <CreditRing
                  credits={account.credits}
                  total={account.creditsTotal}
                  tier={account.tier}
                />
                <p className="mt-3 text-xs text-white/30">
                  Resets in {formatResetCountdown(account.creditsResetAt)}
                </p>
              </>
            ) : error ? (
              <div className="flex h-[200px] flex-col items-center justify-center gap-3">
                <p className="text-sm text-white/30">
                  Could not load account data.
                </p>
                <button
                  onClick={() => { setLoading(true); fetchAccount(); }}
                  className="text-xs font-medium text-[#ED6B23] transition-colors hover:text-[#d45e1f]"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-sm text-white/30">
                  No account data found.{" "}
                  <a href={TELEGRAM_URL} className="text-[#ED6B23] hover:underline">
                    Message Ghali
                  </a>{" "}
                  first to create your account.
                </p>
              </div>
            )}
          </div>

          {/* Tier Badge */}
          {account && (
            <div className="animate-fade-up delay-200 flex justify-center">
              <div
                className={`
                  inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest
                  ${
                    account.tier === "pro"
                      ? "bg-[#ED6B23]/10 text-[#ED6B23] ring-1 ring-[#ED6B23]/20"
                      : "bg-white/[0.04] text-white/40 ring-1 ring-white/[0.08]"
                  }
                `}
              >
                {account.tier === "pro" && (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                )}
                {account.tier === "pro" ? "Pro" : "Basic"}
                {account.subscriptionCanceling && (
                  <span className="text-[10px] font-normal normal-case tracking-normal text-white/30">
                    (canceling)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Info row */}
          {account && (
            <div className="animate-fade-up delay-300 flex justify-center gap-8 text-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/25">
                  Plan
                </p>
                <p className="mt-1 text-sm font-semibold text-white/70">
                  {account.tier === "pro" ? "$9.99/mo" : "Free"}
                </p>
              </div>
              <div className="h-8 w-px bg-white/[0.06]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/25">
                  Monthly Credits
                </p>
                <p className="mt-1 text-sm font-semibold text-white/70">
                  {account.creditsTotal}
                </p>
              </div>
              <div className="h-8 w-px bg-white/[0.06]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/25">
                  Member Since
                </p>
                <p className="mt-1 text-sm font-semibold text-white/70">
                  {formatDate(account.createdAt)}
                </p>
              </div>
            </div>
          )}

          {/* Action cards */}
          <div className="animate-fade-up delay-400 space-y-2.5">

            {/* Manage Subscription / Upgrade */}
            <Link
              href="/upgrade"
              className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4.5 transition-all hover:border-[#ED6B23]/25 hover:bg-[#ED6B23]/[0.03]"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#ED6B23]/10 border border-[#ED6B23]/15 transition-colors group-hover:bg-[#ED6B23]/15">
                <CreditCardIcon className="h-4.5 w-4.5 text-[#ED6B23]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90">
                  {account?.tier === "pro" ? "Manage Subscription" : "Upgrade to Pro"}
                </p>
                <p className="mt-0.5 text-xs text-white/30">
                  {account?.tier === "pro"
                    ? "View billing, change plan, or cancel"
                    : "600 credits/mo (10x Basic)"}
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/15 transition-colors group-hover:text-[#ED6B23]/50" />
            </Link>

            {/* Admin Dashboard */}
            {isAdmin && (
              <Link
                href="/admin"
                className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4.5 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] transition-colors group-hover:bg-white/[0.08]">
                  <ShieldIcon className="h-4.5 w-4.5 text-white/50" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white/90">Admin Dashboard</p>
                  <p className="mt-0.5 text-xs text-white/30">
                    Users, stats, and templates
                  </p>
                </div>
                <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/15 transition-colors group-hover:text-white/30" />
              </Link>
            )}

            {/* Give Feedback */}
            <Link
              href="/feedback"
              className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4.5 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/15 transition-colors group-hover:bg-purple-500/15">
                <MessageHeartIcon className="h-4.5 w-4.5 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90">Give Feedback</p>
                <p className="mt-0.5 text-xs text-white/30">
                  Share bugs, ideas, or suggestions
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/15 transition-colors group-hover:text-white/30" />
            </Link>

            {/* Telegram */}
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4.5 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#2AABEE]/10 border border-[#2AABEE]/15 transition-colors group-hover:bg-[#2AABEE]/15">
                <TelegramIcon className="h-4.5 w-4.5 text-[#2AABEE]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90">Chat with Ghali</p>
                <p className="mt-0.5 text-xs text-white/30">
                  Open Telegram conversation
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/15 transition-colors group-hover:text-white/30" />
            </a>
          </div>

          {/* Footer */}
          <div className="animate-fade-up delay-500 flex items-center justify-center gap-4 pt-2">
            <Link
              href="/"
              className="text-xs text-white/25 transition-colors hover:text-white/50"
            >
              Home
            </Link>
            <span className="text-white/10">·</span>
            <Link
              href="/privacy"
              className="text-xs text-white/25 transition-colors hover:text-white/50"
            >
              Privacy
            </Link>
            <span className="text-white/10">·</span>
            <Link
              href="/terms"
              className="text-xs text-white/25 transition-colors hover:text-white/50"
            >
              Terms
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Icons ───────────────────────────────────────────── */

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function MessageHeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M15.8 9.2a2.5 2.5 0 0 0-3.5 0l-.3.4-.3-.4a2.5 2.5 0 0 0-3.5 0 2.7 2.7 0 0 0 0 3.7L12 17l3.8-4.1a2.7 2.7 0 0 0 0-3.7z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
