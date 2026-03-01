import Link from "next/link";
import { SectionLabel } from "./section-label";
import type { TranslationDict } from "@/app/lib/i18n/types";

export function Capabilities({ t }: { t: TranslationDict }) {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <SectionLabel>{t.capabilities.label}</SectionLabel>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.capabilities.items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]"
            >
              <span className="shrink-0 text-2xl">{item.icon}</span>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-white/50">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
