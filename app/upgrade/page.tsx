"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignUp,
  PricingTable,
  useAuth,
} from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const WHATSAPP_URL = "https://wa.me/971582896090?text=Hi%20Ghali";

/* ─── Shared Layout ──────────────────────────────── */

function UpgradeLayout({ children }: { children: React.ReactNode }) {
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

      {/* Content — use min-h-dvh for mobile viewport, scroll instead of fixed center */}
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        {/* Orange glow */}
        <div className="pointer-events-none absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />
        <div className="relative w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}

/* ─── State Card ─────────────────────────────────── */

function StateCard({
  icon,
  title,
  description,
  children,
}: {
  icon?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-8 text-center backdrop-blur-sm">
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      {title && (
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
          {title}
        </h1>
      )}
      {description && (
        <p className="mx-auto mt-3 max-w-md text-white/50 leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

function WhatsAppButton({ label = "Open WhatsApp" }: { label?: string }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ED6B23] px-6 py-3 font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
    >
      <WhatsAppIcon className="h-4 w-4" />
      {label}
    </a>
  );
}

/* ─── Main Content ───────────────────────────────── */

function UpgradeContent() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const phone = searchParams.get("phone");
  const { isSignedIn } = useAuth();

  const [linked, setLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Link phone after sign-in via server-verified API route.
  // Also re-calls on success page to capture email added during payment.
  useEffect(() => {
    if (!isSignedIn || (!isSuccess && (linked || error))) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/link-phone", { method: "POST" });
        const result = await res.json();
        if (cancelled) return;
        if (result.success) {
          setLinked(true);
        } else if (!isSuccess) {
          setError(result.error ?? "Failed to link account");
        }
      } catch {
        if (!cancelled && !isSuccess) setError("Something went wrong. Please try again.");
      }
    })();

    return () => { cancelled = true; };
  }, [isSignedIn, linked, error, isSuccess]);

  // ─── Success state
  if (isSuccess) {
    return (
      <UpgradeLayout>
        <StateCard
          icon="🎉"
          title="You're all set!"
          description="Your Pro subscription is active. You now have 600 credits/month, deep reasoning, image generation, and more."
        >
          <p className="mt-2 text-sm text-white/40">
            Head back to WhatsApp and start chatting with Ghali.
          </p>
          <WhatsAppButton />
        </StateCard>
      </UpgradeLayout>
    );
  }

  // ─── Error during linking
  if (error) {
    return (
      <UpgradeLayout>
        <StateCard
          icon="⚠️"
          title="Something went wrong"
          description={error}
        >
          <WhatsAppButton />
        </StateCard>
      </UpgradeLayout>
    );
  }

  // ─── Sign in / Choose plan
  return (
    <UpgradeLayout>
      <SignedOut>
        <SignUp
          routing="hash"
          forceRedirectUrl="/upgrade"
          fallbackRedirectUrl="/upgrade"
          initialValues={phone ? { phoneNumber: phone } : undefined}
          appearance={{ baseTheme: dark }}
        />
      </SignedOut>
      <SignedIn>
        {!linked ? (
          <StateCard>
            <div className="flex items-center justify-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#ED6B23] border-t-transparent" />
              <p className="text-white/50">Linking your account...</p>
            </div>
          </StateCard>
        ) : (
          <PricingTable newSubscriptionRedirectUrl="/upgrade?success=true" />
        )}
      </SignedIn>
    </UpgradeLayout>
  );
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  );
}

/* ─── Icons ───────────────────────────────────────── */

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
