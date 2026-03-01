import { SectionLabel } from "./section-label";
import type { TranslationDict } from "@/app/lib/i18n/types";

export function HowItWorks({ t }: { t: TranslationDict }) {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <SectionLabel>{t.howItWorks.label}</SectionLabel>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {t.howItWorks.steps.map((step) => (
            <div key={step.num} className="relative">
              <span className="font-[family-name:var(--font-display)] text-6xl text-[#ED6B23]/20">
                {step.num}
              </span>
              <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-white/50 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
