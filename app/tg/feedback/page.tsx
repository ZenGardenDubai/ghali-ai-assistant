"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";

type FlowState = "loading" | "not_telegram" | "form" | "submitting" | "success" | "error";
type Category = "bug" | "feature_request" | "general";

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: "bug", label: "Bug Report", icon: "🐛" },
  { value: "feature_request", label: "Feature Request", icon: "💡" },
  { value: "general", label: "General Feedback", icon: "💬" },
];

function TelegramFeedbackContent() {
  const [state, setState] = useState<FlowState>("loading");
  const [initData, setInitData] = useState<string | null>(null);
  const [devTelegramId, setDevTelegramId] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Step 1: Verify Telegram identity
  useEffect(() => {
    if (state !== "loading") return;

    const webapp = window.Telegram?.WebApp;
    if (webapp?.initData) {
      webapp.ready();
      webapp.expand();

      (async () => {
        try {
          const res = await fetch("/api/tg-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: webapp.initData }),
          });

          if (!res.ok) {
            setState("error");
            setError("Could not verify your identity. Please try again.");
            return;
          }

          setInitData(webapp.initData);
          setState("form");
        } catch {
          setState("error");
          setError("Connection error. Please try again.");
        }
      })();
      return;
    }

    // Dev mode: allow testing in regular browser with ?telegramId=xxx
    if (process.env.NODE_ENV === "development") {
      const devId = new URLSearchParams(window.location.search).get("telegramId");
      if (devId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- dev-only shortcut, tree-shaken in production
        setDevTelegramId(devId);
        setInitData("dev_mode"); // eslint-disable-line react-hooks/set-state-in-effect
        setState("form"); // eslint-disable-line react-hooks/set-state-in-effect
        return;
      }
    }

    setState("not_telegram"); // eslint-disable-line react-hooks/set-state-in-effect
  }, [state]);

  const handleSubmit = async () => {
    if (!category || !message.trim() || !initData) return;

    setState("submitting");
    try {
      const res = await fetch("/api/tg-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          category,
          message: message.trim(),
          ...(devTelegramId ? { devTelegramId } : {}),
        }),
      });

      const result = await res.json();
      if (result.success) {
        setState("success");
      } else {
        setState("error");
        setError(
          result.error === "rate_limited"
            ? "You've reached the daily feedback limit. Please try again tomorrow."
            : "Failed to submit feedback. Please try again."
        );
      }
    } catch {
      setState("error");
      setError("Connection error. Please try again.");
    }
  };

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
          {(state === "form" || state === "submitting") && (
            <FeedbackForm
              category={category}
              onCategoryChange={setCategory}
              message={message}
              onMessageChange={setMessage}
              onSubmit={handleSubmit}
              isSubmitting={state === "submitting"}
            />
          )}
          {state === "success" && <SuccessCard />}
          {state === "error" && (
            <ErrorCard
              message={error || "Something went wrong."}
              onRetry={() => {
                setError(null);
                setState("form");
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default function TelegramFeedbackPage() {
  return (
    <Suspense>
      <TelegramFeedbackContent />
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

function LoadingCard() {
  return (
    <Card>
      <div className="flex items-center justify-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#ED6B23] border-t-transparent" />
        <p className="text-white/50">Verifying...</p>
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
        This page should be opened from the Ghali bot in Telegram. Ask Ghali
        &ldquo;I have feedback&rdquo; to get the link.
      </p>
    </Card>
  );
}

function FeedbackForm({
  category,
  onCategoryChange,
  message,
  onMessageChange,
  onSubmit,
  isSubmitting,
}: {
  category: Category | null;
  onCategoryChange: (c: Category) => void;
  message: string;
  onMessageChange: (m: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const canSubmit = category && message.trim().length > 0 && !isSubmitting;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="animate-fade-up">
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
          Send <span className="text-[#ED6B23]">Feedback</span>
        </h1>

        <p className="mx-auto mt-3 max-w-xs text-white/45 leading-relaxed">
          Help us make Ghali better. Your feedback goes directly to the team.
        </p>
      </Card>

      {/* Category selection */}
      <Card className="animate-fade-up [animation-delay:150ms]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Category
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={`rounded-xl border px-3 py-3 text-center transition-all ${
                category === cat.value
                  ? "border-[#ED6B23]/40 bg-[#ED6B23]/10 text-white"
                  : "border-white/[0.06] bg-white/[0.02] text-white/50 hover:border-white/[0.12] hover:bg-white/[0.04]"
              }`}
            >
              <div className="text-xl mb-1">{cat.icon}</div>
              <div className="text-xs font-medium">{cat.label}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Message input */}
      <Card className="animate-fade-up [animation-delay:300ms]">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Your message
        </p>
        <textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Tell us what's on your mind..."
          rows={4}
          maxLength={2000}
          className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-[#ED6B23]/40 focus:bg-white/[0.04]"
        />
        <p className="mt-2 text-right text-xs text-white/20">
          {message.length}/2000
        </p>
      </Card>

      {/* Submit button */}
      <div className="animate-fade-up [animation-delay:450ms]">
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="group relative w-full overflow-hidden rounded-full bg-[#ED6B23] py-4 text-base font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-xl hover:shadow-[#ED6B23]/25 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#ED6B23] disabled:hover:shadow-none disabled:active:scale-100"
        >
          <span className="relative z-10">
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </span>
            ) : (
              "Submit Feedback"
            )}
          </span>
          {!isSubmitting && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          )}
        </button>
      </div>
    </div>
  );
}

function SuccessCard() {
  return (
    <Card>
      <div className="mb-4 text-4xl">🎉</div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
        Thank you!
      </h1>
      <p className="mx-auto mt-3 max-w-md text-white/50 leading-relaxed">
        Your feedback has been received. We appreciate you helping make Ghali
        better.
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
