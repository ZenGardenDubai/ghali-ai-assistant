import Link from "next/link";
import { SectionLabel } from "./section-label";
import { IconByKey } from "./icons";
import type { TranslationDict } from "@/app/lib/i18n/types";

export function Strengths({ t }: { t: TranslationDict }) {
  return (
    <section id="features" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>{t.strengths.label}</SectionLabel>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {t.strengths.cards.map((card) => {
            const colSpanClass =
              card.colSpan === "2"
                ? "lg:col-span-2"
                : card.colSpan === "3"
                  ? "md:col-span-2 lg:col-span-3"
                  : "";

            return (
              <Link
                key={card.title}
                href={card.href}
                className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04] ${colSpanClass}`}
              >
                {card.horizontal ? (
                  <div className="flex items-start gap-6">
                    <div className="shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
                        <IconByKey name={card.icon} />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl">
                        {card.title}
                      </h3>
                      <p className="mt-3 text-white/50 leading-relaxed">
                        {card.description}
                        {card.linkText && (
                          <>
                            {" "}
                            <span className="inline-flex items-center gap-1 text-[#ED6B23]">
                              {card.linkText}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
                      <IconByKey name={card.icon} />
                    </div>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-white/50 leading-relaxed">
                      {card.description}
                    </p>

                    {card.useCases && (
                      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {card.useCases.map((uc) => (
                          <div
                            key={uc.title}
                            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center"
                          >
                            <div className="text-2xl">{uc.icon}</div>
                            <div className="mt-2 text-sm font-medium">{uc.title}</div>
                            <div className="mt-1 text-xs text-white/40">{uc.desc}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
