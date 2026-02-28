"use client";

import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, Suspense } from "react";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

const CATEGORIES = [
  { value: "bug", label: "Bug Report", emoji: "🐛" },
  { value: "feature_request", label: "Feature Request", emoji: "💡" },
  { value: "general", label: "General Feedback", emoji: "💬" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

function FeedbackForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { isSignedIn, isLoaded } = useAuth();

  const [category, setCategory] = useState<Category>("general");
  const [message, setMessage] = useState("");
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate token on load
  useEffect(() => {
    if (!token) return;

    async function validateToken() {
      try {
        const res = await fetch(`${CONVEX_SITE_URL}/feedback/validate-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.valid) {
          setTokenValid(true);
          setMaskedPhone(data.phone);
        } else {
          setTokenValid(false);
          const reasons: Record<string, string> = {
            expired: "This link has expired. Please request a new one.",
            used: "This link has already been used.",
            not_found: "Invalid link. Please request a new one.",
          };
          setTokenError(reasons[data.reason] ?? "Invalid link.");
        }
      } catch {
        setTokenValid(false);
        setTokenError("Failed to validate link. Please try again.");
      }
    }

    validateToken();
  }, [token]);

  const isTokenMode = !!token;
  const isClerkMode = !token && isLoaded && isSignedIn;
  const canSubmit = (isTokenMode && tokenValid) || isClerkMode;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !message.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      if (isTokenMode) {
        const res = await fetch(`${CONVEX_SITE_URL}/feedback/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, category, message: message.trim() }),
        });
        const data = await res.json();
        if (data.success) {
          setSubmitted(true);
        } else {
          const errors: Record<string, string> = {
            rate_limited: "You've reached the daily feedback limit (3/day). Try again tomorrow.",
            token_expired: "This link has expired. Please request a new one.",
            token_used: "This link has already been used.",
          };
          setError(errors[data.error] ?? "Failed to submit. Please try again.");
        }
      } else {
        const res = await fetch("/api/feedback/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, message: message.trim() }),
        });
        const data = await res.json();
        if (data.success) {
          setSubmitted(true);
        } else {
          const errors: Record<string, string> = {
            rate_limited: "You've reached the daily feedback limit (3/day). Try again tomorrow.",
          };
          setError(errors[data.error] ?? data.error ?? "Failed to submit. Please try again.");
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state for token validation
  if (isTokenMode && tokenValid === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ED6B23] border-t-transparent" />
      </div>
    );
  }

  // Token invalid state
  if (isTokenMode && tokenValid === false) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-semibold text-white/80">{tokenError}</p>
        <p className="mt-3 text-sm text-white/30">
          Ask Ghali to send you a new feedback link.
        </p>
      </div>
    );
  }

  // Not authenticated (no token, not signed in)
  if (!isTokenMode && isLoaded && !isSignedIn) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-semibold text-white/80">
          Sign in to submit feedback
        </p>
        <p className="mt-3 text-sm text-white/30">
          Or ask Ghali on WhatsApp for a feedback link.
        </p>
        <Link
          href="/auth/admin-sign-in"
          className="mt-6 inline-block rounded-xl bg-[#ED6B23] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d45e1f]"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-semibold text-white">Thank you!</h2>
        <p className="mt-2 text-sm text-white/40">
          Your feedback has been submitted. We appreciate you helping make Ghali better.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-[#ED6B23] hover:text-[#d45e1f] transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity display */}
      {maskedPhone && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="text-xs text-white/30">Submitting as</p>
          <p className="mt-0.5 text-sm font-medium text-white/70">{maskedPhone}</p>
        </div>
      )}

      {/* Category selector */}
      <div>
        <label className="block text-sm font-medium text-white/50 mb-3">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`
                flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all
                ${
                  category === cat.value
                    ? "border-[#ED6B23]/40 bg-[#ED6B23]/10 text-white"
                    : "border-white/[0.06] bg-white/[0.02] text-white/50 hover:border-white/[0.12] hover:bg-white/[0.04]"
                }
              `}
            >
              <span className="text-lg">{cat.emoji}</span>
              <span className="text-xs font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-white/50 mb-2">
          Your Feedback
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
          placeholder="Tell us what's on your mind..."
          rows={5}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#ED6B23]/40 focus:bg-white/[0.04] resize-none"
        />
        <div className="mt-1.5 flex justify-end">
          <span className={`text-xs ${message.length > 1800 ? "text-[#ED6B23]" : "text-white/20"}`}>
            {message.length}/2000
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !message.trim()}
        className="w-full rounded-xl bg-[#ED6B23] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#d45e1f] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Submitting...
          </span>
        ) : (
          "Submit Feedback"
        )}
      </button>
    </form>
  );
}

export default function FeedbackPage() {
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
      </header>

      <main className="relative z-10 flex flex-col items-center px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-white">
              Share Your Feedback
            </h1>
            <p className="mt-2 text-sm text-white/35">
              Help us make Ghali better. Report bugs, suggest features, or share your thoughts.
            </p>
          </div>

          {/* Form */}
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ED6B23] border-t-transparent" />
              </div>
            }
          >
            <FeedbackForm />
          </Suspense>

          {/* Footer */}
          <div className="flex items-center justify-center gap-4 pt-4">
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
          </div>
        </div>
      </main>
    </div>
  );
}
