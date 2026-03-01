import { CtaButton } from "./cta-button";
import { WhatsAppIcon } from "./icons";
import type { TranslationDict } from "@/app/lib/i18n/types";

export function FinalCta({ t }: { t: TranslationDict }) {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Orange glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
          {t.finalCta.title}{" "}
          <span className="text-[#ED6B23]">{t.finalCta.titleHighlight}</span>?
        </h2>
        <p className="mt-4 text-lg text-white/50">
          {t.finalCta.subtitle}
        </p>
        <CtaButton
          href={t.whatsappUrl}
          location="final_cta"
          className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[#ED6B23] px-8 py-4 text-lg font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-xl hover:shadow-[#ED6B23]/25"
        >
          <WhatsAppIcon className="h-5 w-5" />
          {t.finalCta.cta}
          <span className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180">
            &rarr;
          </span>
        </CtaButton>
      </div>
    </section>
  );
}
