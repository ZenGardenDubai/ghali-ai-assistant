import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaButton } from "@/app/components/landing/cta-button";
import { TelegramIcon } from "@/app/components/landing/icons";
import { ar } from "@/app/lib/i18n/translations";

export const metadata: Metadata = {
  title: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0639 \u063A\u0627\u0644\u064A",
  description: "\u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0630\u0643\u064A \u0639\u0644\u0649 \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645. \u0645\u062C\u0627\u0646\u064A\u060C \u0628\u062F\u0648\u0646 \u062A\u0633\u062C\u064A\u0644\u060C 60 \u0631\u0633\u0627\u0644\u0629/\u0634\u0647\u0631.",
  alternates: {
    canonical: "https://ghali.ae/ar/start",
    languages: { en: "https://ghali.ae/start", ar: "https://ghali.ae/ar/start", "x-default": "https://ghali.ae/start" },
  },
  openGraph: {
    title: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0639 \u063A\u0627\u0644\u064A",
    description: "\u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0630\u0643\u064A \u0639\u0644\u0649 \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645. \u0645\u062C\u0627\u0646\u064A\u060C \u0628\u062F\u0648\u0646 \u062A\u0633\u062C\u064A\u0644\u060C 60 \u0631\u0633\u0627\u0644\u0629/\u0634\u0647\u0631.",
    url: "https://ghali.ae/ar/start",
    locale: "ar_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "\u063A\u0627\u0644\u064A \u2014 \u0645\u0633\u0627\u0639\u062F \u0630\u0643\u064A \u0639\u0644\u0649 \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0639 \u063A\u0627\u0644\u064A",
    description: "\u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0630\u0643\u064A \u0639\u0644\u0649 \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645. \u0645\u062C\u0627\u0646\u064A\u060C \u0628\u062F\u0648\u0646 \u062A\u0633\u062C\u064A\u0644\u060C 60 \u0631\u0633\u0627\u0644\u0629/\u0634\u0647\u0631.",
    images: ["/ghali-logo-with-bg.png"],
  },
  robots: { index: true, follow: true },
};

const t = ar;

export default function ArStartPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e] px-6">
      <div className="w-full max-w-md text-center">
        <Image
          src="/ghali-logo-no-bg.svg"
          alt="\u063A\u0627\u0644\u064A"
          width={100}
          height={100}
          priority
          className="mx-auto mb-8"
        />

        <h1 className="font-[family-name:var(--font-display)] text-3xl text-white sm:text-4xl">
          {t.start.headline}
        </h1>

        <p className="mt-4 text-lg text-white/40 font-mono tracking-wider" dir="ltr">
          {t.start.phone}
        </p>

        <CtaButton
          href={t.telegramUrl}
          location="start_page_ar"
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
