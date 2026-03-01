import { SectionLabel } from "./section-label";
import { FaqAccordion } from "./faq";
import type { TranslationDict } from "@/app/lib/i18n/types";

export function FaqSection({ t }: { t: TranslationDict }) {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-3xl">
        <SectionLabel>{t.faq.label}</SectionLabel>

        <div className="mt-12">
          <FaqAccordion items={t.faq.items} />
        </div>
      </div>
    </section>
  );
}
