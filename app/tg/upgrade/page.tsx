"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useCallback } from "react";
import {
  SignUp,
  PricingTable,
  useAuth,
} from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { usePostHog } from "posthog-js/react";
import Image from "next/image";

type FlowState =
  | "loading"
  | "not_telegram"
  | "welcome"
  | "sign_up"
  | "linking"
  | "pricing"
  | "success"
  | "error";

function TelegramUpgradeContent() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const { isSignedIn, isLoaded } = useAuth();

  const posthog = usePostHog();
  const [state, setState] = useState<FlowState>("loading");
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const distinctId = telegramId ? `tg:${telegramId}` : undefined;

  // Step 1: Wait for Clerk to load, then verify identity
  useEffect(() => {
    // Don't do anything until Clerk has loaded
    if (!isLoaded) return;

    if (isSuccess) {
      posthog?.capture("tg_upgrade_success", { distinct_id: distinctId });
      setState("success");
      return;
    }

    // Already past loading state — don't re-run init
    if (state !== "loading") return;

    // Always try fresh initData verification first (takes priority over localStorage)
    const webapp = window.Telegram?.WebApp;
    if (webapp?.initData) {
      webapp.ready();
      webapp.expand();

      (async () => {
        posthog?.capture("tg_upgrade_verification_started");
        try {
          const res = await fetch("/api/tg-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: webapp.initData }),
          });

          if (!res.ok) {
            posthog?.capture("tg_upgrade_verification_failed", { reason: `http_${res.status}` });
            setState("error");
            setError("Could not verify your identity. Please try again.");
            return;
          }

          const data = await res.json();
          const id = `tg:${data.telegramId}`;
          posthog?.capture("tg_upgrade_verification_success", { distinct_id: id });
          setTelegramId(data.telegramId);
          localStorage.setItem("tg_upgrade_telegramId", JSON.stringify({ id: data.telegramId, ts: Date.now() }));
          if (isSignedIn) {
            setState("linking");
          } else {
            setState("welcome");
          }
        } catch {
          posthog?.capture("tg_upgrade_verification_failed", { reason: "network_error" });
          setState("error");
          setError("Connection error. Please try again.");
        }
      })();
      return;
    }

    // Fallback: use saved telegramId from pre-redirect (Clerk OAuth loses WebApp context)
    // Expires after 15 minutes to prevent stale identity binding
    const savedRaw = localStorage.getItem("tg_upgrade_telegramId");
    let savedTelegramId: string | null = null;
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (parsed?.id && parsed?.ts && Date.now() - parsed.ts < 15 * 60 * 1000) {
          savedTelegramId = parsed.id;
        } else {
          localStorage.removeItem("tg_upgrade_telegramId");
        }
      } catch {
        // Legacy format (plain string) — treat as expired
        localStorage.removeItem("tg_upgrade_telegramId");
      }
    }
    if (savedTelegramId) {
      setTelegramId(savedTelegramId);
      if (isSignedIn) {
        setState("linking");
      } else {
        setState("sign_up");
      }
      return;
    }

    // Dev mode: allow testing in regular browser with ?telegramId=xxx
    if (process.env.NODE_ENV === "development") {
      const devTelegramId = new URLSearchParams(window.location.search).get("telegramId");
      if (devTelegramId) {
        setTelegramId(devTelegramId);
        localStorage.setItem("tg_upgrade_telegramId", JSON.stringify({ id: devTelegramId, ts: Date.now() }));
        setState("welcome");
        return;
      }
    }

    setState("not_telegram");
  }, [isLoaded, isSuccess, isSignedIn, state, posthog, distinctId]);

  // Step 3: Link accounts after Clerk sign-up
  const linkAccount = useCallback(async () => {
    if (!telegramId || linked || isLinking) return;
    setIsLinking(true);
    setState("linking");
    posthog?.capture("tg_upgrade_linking_started", { distinct_id: distinctId });

    try {
      const res = await fetch("/api/link-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId }),
      });

      const result = await res.json();
      if (result.success) {
        posthog?.capture("tg_upgrade_linking_success", { distinct_id: distinctId });
        setLinked(true);
        setState("pricing");
      } else {
        posthog?.capture("tg_upgrade_linking_failed", { distinct_id: distinctId, reason: result.error });
        setState("error");
        setError(result.error || "Failed to link account.");
      }
    } catch {
      posthog?.capture("tg_upgrade_linking_failed", { distinct_id: distinctId, reason: "network_error" });
      setState("error");
      setError("Connection error. Please try again.");
    } finally {
      setIsLinking(false);
    }
  }, [telegramId, linked, isLinking, posthog, distinctId]);

  // Auto-link whenever signed in with a telegramId (covers both in-page auth change and redirect)
  useEffect(() => {
    if (isLoaded && isSignedIn && telegramId && !linked && !isLinking && state !== "success" && state !== "pricing" && state !== "error") {
      linkAccount();
    }
  }, [isLoaded, isSignedIn, telegramId, linked, isLinking, state, linkAccount]);

  return (
    <div className="relative min-h-screen bg-[#0a0f1e] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="pointer-events-none absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />
        <div className="relative w-full max-w-lg">
          {state === "loading" && <LoadingCard />}
          {state === "not_telegram" && <NotTelegramCard />}
          {state === "welcome" && (
            <WelcomeCard onContinue={() => {
              // If already signed in (previous session), skip sign-up
              if (isSignedIn) {
                linkAccount();
              } else {
                setState("sign_up");
              }
            }} />
          )}
          {state === "sign_up" && (
            <SignUp
              routing="hash"
              forceRedirectUrl="/tg/upgrade"
              signInUrl="/tg/upgrade"
              appearance={{ baseTheme: dark }}
            />
          )}
          {state === "linking" && <LoadingCard text="Linking your account..." />}
          {state === "pricing" && (
            <PricingTable newSubscriptionRedirectUrl="/tg/upgrade?success=true" />
          )}
          {state === "success" && <SuccessCard />}
          {state === "error" && (
            <ErrorCard
              message={error || "Something went wrong."}
              onRetry={() => {
                posthog?.capture("tg_upgrade_retry", { distinct_id: distinctId });
                setError(null);
                setState("loading");
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default function TelegramUpgradePage() {
  return (
    <Suspense>
      <TelegramUpgradeContent />
    </Suspense>
  );
}

/* ─── Card Components ─────────────────────────────── */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 text-center backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function LoadingCard({ text = "Verifying..." }: { text?: string }) {
  return (
    <Card>
      <div className="flex items-center justify-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#ED6B23] border-t-transparent" />
        <p className="text-white/50">{text}</p>
      </div>
    </Card>
  );
}

function NotTelegramCard() {
  return (
    <Card>
      <div className="mb-4 text-4xl">📱</div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
        Open in Telegram
      </h1>
      <p className="mx-auto mt-3 max-w-md text-white/50 leading-relaxed">
        This page should be opened from the Ghali bot in Telegram. Tap the
        &ldquo;Upgrade&rdquo; button in the chat to get started.
      </p>
    </Card>
  );
}

function WelcomeCard({ onContinue }: { onContinue: () => void }) {
  const steps = [
    { icon: "🔐", label: "Create billing account", detail: "Quick phone verification" },
    { icon: "💳", label: "Choose your plan", detail: "Monthly or annual pricing" },
    { icon: "⚡", label: "Pro activates instantly", detail: "600 credits, ready to go" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero card with logo and headline */}
      <Card className="animate-fade-up overflow-hidden">
        {/* Ambient glow behind logo */}
        <div className="relative mx-auto mb-5 w-fit">
          <div className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-[#ED6B23]/20 blur-[24px] animate-[pulse-glow_4s_ease-in-out_infinite]" />
          <div className="relative rounded-2xl border border-[#ED6B23]/15 bg-[#ED6B23]/[0.06] p-4">
            <Image
              src="/ghali-logo-no-bg.svg"
              alt="Ghali"
              width={56}
              height={56}
            />
          </div>
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight">
          Upgrade to{" "}
          <span className="relative">
            <span className="text-[#ED6B23]">Pro</span>
            <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 60 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4.5C15 1 45 1 59 4.5" stroke="#ED6B23" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
            </svg>
          </span>
        </h1>

        <p className="mx-auto mt-3 max-w-xs text-white/45 leading-relaxed">
          10x more credits. Same features. Unlock the full power of Ghali.
        </p>

        {/* Credit comparison */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <div className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs">
            <span className="text-white/30">Basic</span>{" "}
            <span className="text-white/50 font-medium">60/mo</span>
          </div>
          <svg className="h-3 w-3 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <div className="rounded-lg bg-[#ED6B23]/10 px-3 py-1.5 text-xs ring-1 ring-[#ED6B23]/20">
            <span className="text-[#ED6B23]/70">Pro</span>{" "}
            <span className="text-[#ED6B23] font-semibold">600/mo</span>
          </div>
        </div>
      </Card>

      {/* Steps card */}
      <Card className="animate-fade-up [animation-delay:150ms]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          How it works
        </p>
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={i} className="relative flex items-start gap-3.5 text-left">
              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[17px] top-[36px] h-[calc(100%-20px)] w-px bg-gradient-to-b from-white/[0.08] to-transparent" />
              )}
              {/* Step icon */}
              <div className="relative z-10 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-sm">
                {step.icon}
              </div>
              {/* Step text */}
              <div className="pb-4">
                <p className="text-sm font-medium text-white/80">{step.label}</p>
                <p className="mt-0.5 text-xs text-white/30">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      <div className="animate-fade-up [animation-delay:300ms] space-y-2.5">
        <button
          onClick={onContinue}
          className="group relative w-full overflow-hidden rounded-full bg-[#ED6B23] py-4 text-base font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-xl hover:shadow-[#ED6B23]/25 active:scale-[0.98]"
        >
          <span className="relative z-10">Get Started</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </button>
        <p className="text-center text-xs text-white/20">
          $9.99/month or $99.48/year (save 17%)
        </p>
      </div>
    </div>
  );
}

function SuccessCard() {
  // Clean up session storage on success
  useEffect(() => {
    localStorage.removeItem("tg_upgrade_telegramId");
  }, []);

  return (
    <Card>
      <div className="mb-4 text-4xl">🎉</div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
        You&apos;re all set!
      </h1>
      <p className="mx-auto mt-3 max-w-md text-white/50 leading-relaxed">
        Your Pro plan is now active. Head back to the chat and enjoy 600
        credits per month.
      </p>
      <button
        onClick={() => window.Telegram?.WebApp?.close()}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ED6B23] px-8 py-3.5 font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
      >
        Back to Chat
      </button>
    </Card>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <div className="mb-4 text-4xl">⚠️</div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mx-auto mt-3 max-w-md text-white/50 leading-relaxed">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ED6B23] px-8 py-3.5 font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
      >
        Try Again
      </button>
    </Card>
  );
}
