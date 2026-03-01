import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaButton } from "@/app/components/landing/cta-button";
import { ar } from "@/app/lib/i18n/translations";

export const metadata: Metadata = {
  title: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0639 \u063A\u0627\u0644\u064A",
  description: "\u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0630\u0643\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628. \u0645\u062C\u0627\u0646\u064A\u060C \u0628\u062F\u0648\u0646 \u062A\u0633\u062C\u064A\u0644\u060C 60 \u0631\u0633\u0627\u0644\u0629/\u0634\u0647\u0631.",
  alternates: {
    canonical: "https://ghali.ae/ar/start",
    languages: { en: "https://ghali.ae/start", ar: "https://ghali.ae/ar/start" },
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
          href={t.whatsappUrl}
          location="start_page_ar"
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] px-10 py-5 text-xl font-semibold text-white transition-all hover:bg-[#1ebe5d] hover:shadow-xl hover:shadow-[#25D366]/25"
        >
          <WhatsAppIcon className="h-6 w-6" />
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
