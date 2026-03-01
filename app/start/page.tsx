import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaButton } from "../components/landing/cta-button";
import { StickyWhatsAppCta } from "../components/landing/sticky-whatsapp-cta";

export const metadata: Metadata = {
  title: "Get Started with Ghali — Your AI Assistant on WhatsApp",
  description:
    "Start chatting with Ghali on WhatsApp in seconds. Free to try — no signup, no app to install.",
  alternates: {
    canonical: "https://ghali.ae/start",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const WHATSAPP_URL = "https://wa.me/971582896090?text=Hi%20Ghali";
const WHATSAPP_NUMBER = "+971 582 896 090";

const STEPS = [
  {
    num: "1",
    icon: "📱",
    title: "Save the number",
    desc: (
      <>
        Add{" "}
        <span className="font-semibold text-white">{WHATSAPP_NUMBER}</span> to
        your WhatsApp contacts as &ldquo;Ghali&rdquo;
      </>
    ),
  },
  {
    num: "2",
    icon: "💬",
    title: "Say hi on WhatsApp",
    desc: 'Open WhatsApp and send a message — try "Hi Ghali" or jump straight into your question.',
  },
  {
    num: "3",
    icon: "✨",
    title: "Ask anything",
    desc: "Chat naturally. Ask questions, analyze documents, generate images, set reminders — Ghali handles it all.",
  },
];

const TRUST_SIGNALS = [
  { icon: "✓", text: "Free to start" },
  { icon: "✓", text: "60 messages/month free" },
  { icon: "✓", text: "No signup required" },
  { icon: "✓", text: "No app to install" },
];

export default function StartPage() {
  return (
    <div className="relative min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Minimal nav — just logo */}
      <nav className="relative z-10 px-6 py-5">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/ghali-logo-no-bg.svg"
              alt="Ghali"
              width={32}
              height={32}
            />
            <span className="text-lg font-semibold tracking-tight">Ghali</span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-12 pb-16 md:pt-20 md:pb-24">
        {/* Orange glow */}
        <div className="animate-pulse-glow pointer-events-none absolute top-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="animate-fade-up animate-float mx-auto mb-8 w-fit">
            <Image
              src="/ghali-logo-no-bg.svg"
              alt="Ghali"
              width={100}
              height={100}
              priority
            />
          </div>

          <h1 className="animate-fade-up delay-100 font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl md:text-6xl">
            Your AI Assistant
            <br />
            <span className="text-[#ED6B23]">is one message away</span>
          </h1>

          <p className="animate-fade-up delay-200 mx-auto mt-5 max-w-lg text-lg text-white/50">
            No account. No download. Just open WhatsApp and start chatting with
            Ghali — free.
          </p>

          {/* Primary CTA */}
          <div className="animate-fade-up delay-300 mt-10">
            <CtaButton
              href={WHATSAPP_URL}
              location="start_hero"
              className="group inline-flex items-center gap-3 rounded-full bg-[#25D366] px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-[#1fb855] hover:shadow-xl hover:shadow-[#25D366]/25"
            >
              <WhatsAppIcon className="h-6 w-6" />
              Open WhatsApp Now
              <span className="transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </CtaButton>
          </div>

          {/* Trust signals */}
          <div className="animate-fade-up delay-300 mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {TRUST_SIGNALS.map((s) => (
              <span key={s.text} className="flex items-center gap-1.5 text-sm text-white/40">
                <span className="text-[#25D366] font-semibold">{s.icon}</span>
                {s.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="mx-auto max-w-3xl">
          <p className="mb-10 text-center text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
            3 steps to get started
          </p>

          <div className="grid gap-6 sm:gap-8">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="flex items-start gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
                  {step.icon}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#ED6B23]/60">
                      Step {step.num}
                    </span>
                  </div>
                  <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
                  <p className="mt-1.5 text-white/50 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Second CTA after steps */}
          <div className="mt-12 text-center">
            <CtaButton
              href={WHATSAPP_URL}
              location="start_steps"
              className="group inline-flex items-center gap-3 rounded-full bg-[#25D366] px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-[#1fb855] hover:shadow-xl hover:shadow-[#25D366]/25"
            >
              <WhatsAppIcon className="h-6 w-6" />
              Start Chatting — It&apos;s Free
              <span className="transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </CtaButton>
          </div>
        </div>
      </section>

      {/* Capabilities teaser */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="mx-auto max-w-3xl">
          <p className="mb-8 text-center text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
            What you can do with Ghali
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: "💬", text: "Ask questions — quick answers or deep research" },
              { icon: "🖼️", text: "Generate images — just describe what you want" },
              { icon: "📄", text: "Analyze documents — send a PDF, get insights" },
              { icon: "⏰", text: "Set reminders and schedule recurring tasks" },
              { icon: "🧠", text: "Remembers your preferences across conversations" },
              { icon: "🌍", text: "Speaks Arabic, English, and many more languages" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-white/60">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Orange glow */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-[#ED6B23]/8 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
            Simple pricing
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Start free. Upgrade when ready.
          </h2>
          <p className="mt-4 text-white/50">
            Basic plan is free forever — 60 messages/month, all features
            included. Need more?
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#ED6B23]/30 bg-[#ED6B23]/[0.06] px-6 py-3 text-sm">
            <span className="font-semibold">Pro:</span>
            <span className="text-white/70">$9.99/mo</span>
            <span className="text-white/30">·</span>
            <span className="text-white/70">AED 36.99/mo</span>
            <span className="text-white/30">·</span>
            <span className="text-white/50">600 messages</span>
          </div>
          <p className="mt-3 text-sm text-white/30">
            Just send &ldquo;upgrade&rdquo; to Ghali to get Pro
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-sm text-white/30">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-4 text-white/40">
            <Link href="/" className="transition-colors hover:text-white">Home</Link>
            <Link href="/features" className="transition-colors hover:text-white">Features</Link>
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
          </div>
          <p>&copy; 2026 SAHEM DATA TECHNOLOGY. Made with ❤️ in the UAE 🇦🇪</p>
        </div>
      </footer>

      <StickyWhatsAppCta />
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
