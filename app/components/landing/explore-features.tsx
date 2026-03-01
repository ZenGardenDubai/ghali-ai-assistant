import Link from "next/link";
import type { TranslationDict } from "@/app/lib/i18n/types";

export function ExploreFeatures({ t }: { t: TranslationDict }) {
  return (
    <section className="relative px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Link
          href={t.exploreFeatures.href}
          className="group relative block overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-r from-[#ED6B23]/[0.06] to-transparent p-8 transition-all hover:border-[#ED6B23]/30 sm:p-10"
        >
          <div className="pointer-events-none absolute -right-20 top-1/2 h-[200px] w-[200px] -translate-y-1/2 rounded-full bg-[#ED6B23]/10 blur-[80px] transition-opacity duration-500 opacity-0 group-hover:opacity-100 rtl:-left-20 rtl:right-auto" />

          <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
                {t.exploreFeatures.tagline}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
                {t.exploreFeatures.title}
              </h2>
              <p className="mt-2 text-white/40">
                {t.exploreFeatures.description}
              </p>
            </div>
            <span className="shrink-0 flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-medium transition-all group-hover:border-[#ED6B23]/40 group-hover:bg-[#ED6B23]/10 group-hover:text-[#ED6B23]">
              {t.exploreFeatures.cta}
              <span className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180">
                &rarr;
              </span>
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
