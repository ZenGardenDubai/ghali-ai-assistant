import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaButton } from "@/app/components/landing/cta-button";
import { TelegramIcon } from "@/app/components/landing/icons";
import { en } from "@/app/lib/i18n/translations";

export const metadata: Metadata = {
  title: "Start Chatting with Ghali",
  description: "Your AI assistant on Telegram. Free, no signup, 60 messages/month.",
  alternates: {
    canonical: "https://ghali.ae/start",
    languages: { en: "https://ghali.ae/start", ar: "https://ghali.ae/ar/start", "x-default": "https://ghali.ae/start" },
  },
  openGraph: {
    title: "Start Chatting with Ghali",
    description: "Your AI assistant on Telegram. Free, no signup, 60 messages/month.",
    url: "https://ghali.ae/start",
    locale: "en_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "Ghali — AI Assistant on Telegram" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Start Chatting with Ghali",
    description: "Your AI assistant on Telegram. Free, no signup, 60 messages/month.",
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
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#229ED9] px-10 py-5 text-xl font-semibold text-white transition-all hover:bg-[#1a8abf] hover:shadow-xl hover:shadow-[#229ED9]/25"
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

