import { SectionLabel } from "./section-label";
import { CtaButton } from "./cta-button";
import type { TranslationDict } from "@/app/lib/i18n/types";

export function Pricing({ t }: { t: TranslationDict }) {
  return (
    <section id="pricing" className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <SectionLabel>{t.pricing.label}</SectionLabel>

        <div className="mt-12 grid gap-6 md:grid-cols-2 md:max-w-3xl md:mx-auto">
          {/* Basic */}
          <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">
              {t.pricing.basic.name}
            </h3>
            <div className="mt-4 font-[family-name:var(--font-display)] text-5xl">
              {t.pricing.basic.price}
            </div>
            <ul className="mt-8 space-y-3 text-white/60">
              {t.pricing.basic.features.map((f) => (
                <PricingItem key={f.text} highlight={f.highlight}>
                  {f.text}
                </PricingItem>
              ))}
            </ul>
            <CtaButton
              href={t.whatsappUrl}
              location="pricing_basic"
              className="mt-8 block rounded-full border border-white/10 py-3 text-center font-medium transition-all hover:border-white/20 hover:bg-white/5"
            >
              {t.pricing.basic.cta}
            </CtaButton>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border border-[#ED6B23]/40 bg-[#ED6B23]/[0.04] p-8">
            <div className="absolute -top-3 right-6 rtl:right-auto rtl:left-6 rounded-full bg-[#ED6B23] px-3 py-1 text-xs font-bold uppercase tracking-wider">
              {t.pricing.pro.badge}
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
              {t.pricing.pro.name}
            </h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-5xl">
                {t.pricing.pro.pricePrimary}
              </span>
              <span className="text-white/40">{t.pricing.pro.pricePeriod}</span>
            </div>
            <p className="mt-1 text-sm text-white/40">
              {t.pricing.pro.priceSecondary}
            </p>
            <p className="mt-0.5 text-sm text-white/30">
              {t.pricing.pro.priceAlt}
            </p>
            <ul className="mt-8 space-y-3 text-white/60">
              {t.pricing.pro.features.map((f) => (
                <PricingItem key={f.text} highlight={f.highlight}>
                  {f.text}
                </PricingItem>
              ))}
            </ul>
            <CtaButton
              href={t.whatsappUrl}
              location="pricing_pro"
              className="mt-8 md:mt-auto block rounded-full bg-[#ED6B23] py-3 text-center font-medium transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
            >
              {t.pricing.pro.cta}
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingItem({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <svg
        className={`h-4 w-4 shrink-0 ${highlight ? "text-[#ED6B23]" : "text-white/30"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {children}
    </li>
  );
}
