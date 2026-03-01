import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/app/lib/i18n/types";
import { StickyWhatsAppCta } from "./sticky-whatsapp-cta";
import { CtaButton } from "./cta-button";
import { en, ar } from "@/app/lib/i18n/translations";

const WHATSAPP_URLS = {
  en: "https://wa.me/971582896090?text=Hi%20Ghali",
  ar: "https://wa.me/971582896090?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%20%D8%BA%D8%A7%D9%84%D9%8A",
} as const;

const CTA_TEXT = { en: "Start Chatting", ar: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629" } as const;
const READY_TEXT = { en: "Ready to try", ar: "\u062C\u0627\u0647\u0632 \u062A\u062C\u0631\u0628" } as const;
const NO_APP_TEXT = { en: "No app. No signup. Just send a message.", ar: "\u0628\u062F\u0648\u0646 \u062A\u0637\u0628\u064A\u0642. \u0628\u062F\u0648\u0646 \u062A\u0633\u062C\u064A\u0644. \u0628\u0633 \u0627\u0631\u0633\u0644 \u0631\u0633\u0627\u0644\u0629." } as const;
const PRIVACY_TEXT = { en: "Privacy Policy", ar: "\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629" } as const;
const TERMS_TEXT = { en: "Terms of Service", ar: "\u0634\u0631\u0648\u0637 \u0627\u0644\u062E\u062F\u0645\u0629" } as const;
const EXPLORE_FEATURES_TEXT = { en: "Explore all features", ar: "\u0627\u0643\u062A\u0634\u0641 \u0643\u0644 \u0627\u0644\u0645\u0632\u0627\u064A\u0627" } as const;
const EXPLORE_FEATURES_HREF = { en: "/features", ar: "/ar/features" } as const;

export function FeaturePage({
  badge,
  title,
  subtitle,
  children,
  jsonLd,
  locale = "en",
}: {
  badge: string;
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  jsonLd?: Record<string, unknown>;
  locale?: Locale;
}) {
  const whatsappUrl = WHATSAPP_URLS[locale];
  const homeHref = locale === "ar" ? "/ar" : "/";
  const t = locale === "ar" ? ar : en;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0f1e] text-white">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={homeHref} className="flex items-center gap-3">
            <Image src="/ghali-logo-no-bg.svg" alt="Ghali" width={36} height={36} />
            <span className="text-xl font-semibold tracking-tight">Ghali</span>
          </Link>
          <CtaButton
            href={whatsappUrl}
            location={`feature_nav_${locale}`}
            className="flex items-center gap-2 rounded-full bg-[#ED6B23] px-5 py-2.5 text-sm font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
          >
            <WhatsAppIcon className="h-4 w-4" />
            {CTA_TEXT[locale]}
          </CtaButton>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="pointer-events-none absolute top-0 left-1/2 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ED6B23]/20 bg-[#ED6B23]/5 px-4 py-1.5 text-sm text-[#ED6B23]">
            {badge}
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/50">
            {subtitle}
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 pb-8">
        {children}
      </div>

      {/* Related Features link */}
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <Link
          href={EXPLORE_FEATURES_HREF[locale]}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-4 text-sm text-white/50 transition-all hover:border-[#ED6B23]/30 hover:text-white/80"
        >
          {EXPLORE_FEATURES_TEXT[locale]}
          <span className="text-[#ED6B23] rtl:rotate-180">&rarr;</span>
        </Link>
      </div>

      {/* CTA */}
      <section className="relative px-6 py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            {READY_TEXT[locale]} <span className="text-[#ED6B23]">{locale === "ar" ? "\u063A\u0627\u0644\u064A" : "Ghali"}</span>?
          </h2>
          <p className="mt-4 text-white/50">
            {NO_APP_TEXT[locale]}
          </p>
          <CtaButton
            href={whatsappUrl}
            location={`feature_cta_${locale}`}
            className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[#ED6B23] px-8 py-4 text-lg font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-xl hover:shadow-[#ED6B23]/25"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {CTA_TEXT[locale]}
            <span className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180">&rarr;</span>
          </CtaButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 py-6 text-sm text-white/40 sm:flex-row">
          <Link href={homeHref} className="flex items-center gap-3">
            <Image src="/ghali-logo-no-bg.svg" alt="Ghali" width={20} height={20} />
            <span className="font-semibold text-white">ghali.ae</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href={t.footer.privacyHref} className="transition-colors hover:text-white">{PRIVACY_TEXT[locale]}</Link>
            <Link href={t.footer.termsHref} className="transition-colors hover:text-white">{TERMS_TEXT[locale]}</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl py-8 text-center text-sm text-white/30 space-y-2">
          <p>{t.footer.copyright}</p>
          <p>{t.footer.tagline}</p>
          <p>{t.footer.madeWith}</p>
        </div>
      </footer>

      <StickyWhatsAppCta t={t} />
    </div>
  );
}

export function FeatureSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-12">
      {title && (
        <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
      )}
      <div className="text-white/60 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-[#ED6B23]/20 hover:bg-white/[0.04]">
      <div className="mb-3 text-2xl">{icon}</div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/50">{description}</p>
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
