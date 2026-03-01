import Image from "next/image";
import { CtaButton } from "./cta-button";
import { WhatsAppIcon } from "./icons";
import type { TranslationDict } from "@/app/lib/i18n/types";

export function Hero({ t }: { t: TranslationDict }) {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center px-6">
      {/* Orange glow */}
      <div className="animate-pulse-glow pointer-events-none absolute top-1/3 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ED6B23]/15 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="animate-fade-up animate-float mx-auto mb-10 w-fit">
          <Image
            src="/ghali-logo-no-bg.svg"
            alt={t.locale === "ar" ? "تميمة غالي" : "Ghali mascot"}
            width={120}
            height={120}
            priority
          />
        </div>

        <h1 className="animate-fade-up delay-100 font-[family-name:var(--font-display)] text-5xl leading-tight tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          {t.hero.titleLine1}
          <br />
          <span className="text-[#ED6B23]">{t.hero.titleLine2}</span>
        </h1>

        <p className="animate-fade-up delay-200 mx-auto mt-6 max-w-xl text-lg text-white/50 sm:text-xl">
          {t.hero.subtitle}
        </p>

        <div className="animate-fade-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <CtaButton
            href={t.whatsappUrl}
            location="hero"
            className="group flex items-center gap-3 rounded-full bg-[#ED6B23] px-8 py-4 text-lg font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-xl hover:shadow-[#ED6B23]/25"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {t.hero.cta}
            <span className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180">
              &rarr;
            </span>
          </CtaButton>
          <span className="text-sm text-white/30">{t.hero.trust}</span>
        </div>
      </div>
    </section>
  );
}
