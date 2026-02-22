import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Features — Ghali",
  description: "Everything Ghali can do. Image generation, document analysis, deep thinking, personal memory, and more.",
};

const WHATSAPP_URL = "https://wa.me/971582896090?text=Hi%20Ghali";

const FEATURES = [
  {
    icon: "📱",
    title: "Zero Friction",
    desc: "No app, no account, no password. Just open WhatsApp and start chatting.",
    href: "/features/zero-friction",
  },
  {
    icon: "🧠",
    title: "Personal Memory",
    desc: "Ghali learns your preferences, your context, and your style over time.",
    href: "/features/personal-memory",
  },
  {
    icon: "🔒",
    title: "Privacy First",
    desc: "Your data is yours. See it, delete it, control it. We never sell it.",
    href: "/features/privacy",
  },
  {
    icon: "⚡",
    title: "Powered by the Best AI",
    desc: "Google Gemini, Anthropic Claude, and OpenAI — the right model for every task.",
    href: "/features/smart-ai",
  },
  {
    icon: "👁️",
    title: "Understand Anything",
    desc: "Send photos, voice notes, videos, audio — Ghali sees and hears it all.",
    href: "/features/understand-anything",
  },
  {
    icon: "🎨",
    title: "Image Generation",
    desc: "Describe what you want and get a stunning image in seconds.",
    href: "/features/image-generation",
  },
  {
    icon: "📄",
    title: "Documents & Knowledge",
    desc: "Send PDFs and files. Ghali reads them, answers questions, and remembers them.",
    href: "/features/documents",
  },
  {
    icon: "⏰",
    title: "Reminders & Scheduling",
    desc: "Precise reminders, recurring schedules, and proactive check-ins.",
    href: "/features/reminders",
  },
  {
    icon: "🔓",
    title: "Open Source",
    desc: "Our code is public. You can verify exactly how your data is handled.",
    href: "/features/open-source",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/ghali-logo-no-bg.svg" alt="Ghali" width={36} height={36} />
            <span className="text-xl font-semibold tracking-tight">Ghali</span>
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#ED6B23] px-5 py-2.5 text-sm font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
          >
            Start Chatting
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="pointer-events-none absolute top-0 left-1/2 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl md:text-6xl">
            Everything <span className="text-[#ED6B23]">Ghali</span> Can Do
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/50">
            One assistant, powered by the best AI, delivered through WhatsApp. Here&apos;s what&apos;s inside.
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]"
            >
              <div className="mb-4 text-3xl">{f.icon}</div>
              <h2 className="text-xl font-semibold">{f.title}</h2>
              <p className="mt-2 text-white/50 leading-relaxed">{f.desc}</p>
              <span className="mt-4 inline-block text-sm text-[#ED6B23] transition-transform group-hover:translate-x-1">
                Learn more &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 py-6 text-sm text-white/40 sm:flex-row">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/ghali-logo-no-bg.svg" alt="Ghali" width={20} height={20} />
            <span className="font-semibold text-white">ghali.ae</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-white">Terms of Service</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl py-8 text-center text-sm text-white/30 space-y-2">
          <p>&copy; 2026 SAHEM DATA TECHNOLOGY. All rights reserved.</p>
          <p>ghali.ae is a product of SAHEM DATA TECHNOLOGY, Dubai, UAE</p>
          <p>Made with ❤️ in the UAE 🇦🇪</p>
        </div>
      </footer>
    </div>
  );
}
