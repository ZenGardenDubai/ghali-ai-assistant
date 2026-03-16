import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaButton } from "@/app/components/landing/cta-button";
import { en } from "@/app/lib/i18n/translations";

export const metadata: Metadata = {
  title: "Start Chatting with Ghali",
  description: "Your AI assistant on Telegram (formerly WhatsApp). Free, no signup, 60 messages/month.",
  alternates: {
    canonical: "https://ghali.ae/start",
    languages: { en: "https://ghali.ae/start", ar: "https://ghali.ae/ar/start", "x-default": "https://ghali.ae/start" },
  },
  openGraph: {
    title: "Start Chatting with Ghali",
    description: "Your AI assistant on Telegram (formerly WhatsApp). Free, no signup, 60 messages/month.",
    url: "https://ghali.ae/start",
    locale: "en_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "Ghali — AI Assistant on Telegram" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Start Chatting with Ghali",
    description: "Your AI assistant on Telegram (formerly WhatsApp). Free, no signup, 60 messages/month.",
    images: ["/ghali-logo-with-bg.png"],
  },
  robots: { index: true, follow: true },
};

const t = en;

export default function StartPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e] px-6">
      <div className="w-full max-w-md text-center">
        <Image
          src="/ghali-logo-no-bg.svg"
          alt="Ghali"
          width={100}
          height={100}
          priority
          className="mx-auto mb-8"
        />

        <h1 className="font-[family-name:var(--font-display)] text-3xl text-white sm:text-4xl">
          {t.start.headline}
        </h1>

        <p className="mt-4 text-lg text-white/40 font-mono tracking-wider">
          {t.start.phone}
        </p>

        <CtaButton
          href={t.telegramUrl}
          location="start_page"
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#2AABEE] px-10 py-5 text-xl font-semibold text-white transition-all hover:bg-[#229ED9] hover:shadow-xl hover:shadow-[#2AABEE]/25"
        >
          <TelegramIcon className="h-6 w-6" />
          {t.start.cta}
        </CtaButton>

        <p className="mt-6 text-sm text-white/30">
          {t.start.trust}
        </p>

        <Link
          href={t.start.switchLocaleHref}
          className="mt-4 inline-block text-sm text-white/20 transition-colors hover:text-white/40"
        >
          {t.start.switchLocale}
        </Link>
      </div>
    </div>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
