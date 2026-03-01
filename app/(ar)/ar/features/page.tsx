import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { StickyWhatsAppCta } from "@/app/components/landing/sticky-whatsapp-cta";
import { Footer } from "@/app/components/landing/footer";
import { CtaButton } from "@/app/components/landing/cta-button";
import { ar } from "@/app/lib/i18n/translations";

export const metadata: Metadata = {
  title: "\u0627\u0644\u0645\u0632\u0627\u064A\u0627 \u2014 \u063A\u0627\u0644\u064A",
  description: "\u0643\u0644 \u0634\u064A \u063A\u0627\u0644\u064A \u064A\u0642\u062F\u0631 \u064A\u0633\u0648\u064A\u0647. \u0625\u0646\u0634\u0627\u0621 \u0635\u0648\u0631\u060C \u062A\u062D\u0644\u064A\u0644 \u0645\u0633\u062A\u0646\u062F\u0627\u062A\u060C \u062A\u0641\u0643\u064A\u0631 \u0639\u0645\u064A\u0642\u060C \u0630\u0627\u0643\u0631\u0629 \u0634\u062E\u0635\u064A\u0629\u060C \u0648\u0627\u0644\u0645\u0632\u064A\u062F.",
  alternates: {
    canonical: "https://ghali.ae/ar/features",
    languages: { en: "https://ghali.ae/features", ar: "https://ghali.ae/ar/features", "x-default": "https://ghali.ae/features" },
  },
  openGraph: {
    title: "\u0627\u0644\u0645\u0632\u0627\u064A\u0627 \u2014 \u063A\u0627\u0644\u064A",
    description: "\u0643\u0644 \u0634\u064A \u063A\u0627\u0644\u064A \u064A\u0642\u062F\u0631 \u064A\u0633\u0648\u064A\u0647.",
    url: "https://ghali.ae/ar/features",
    locale: "ar_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "\u063A\u0627\u0644\u064A" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "\u0627\u0644\u0645\u0632\u0627\u064A\u0627 \u2014 \u063A\u0627\u0644\u064A",
    description: "\u0643\u0644 \u0634\u064A \u063A\u0627\u0644\u064A \u064A\u0642\u062F\u0631 \u064A\u0633\u0648\u064A\u0647.",
    images: ["/ghali-logo-with-bg.png"],
  },
};

const FEATURES = [
  { icon: "\uD83D\uDCF1", title: "\u0628\u062F\u0648\u0646 \u062A\u0639\u0642\u064A\u062F", desc: "\u0628\u062F\u0648\u0646 \u062A\u0637\u0628\u064A\u0642\u060C \u0628\u062F\u0648\u0646 \u062D\u0633\u0627\u0628\u060C \u0628\u062F\u0648\u0646 \u0643\u0644\u0645\u0629 \u0633\u0631. \u0628\u0633 \u0627\u0641\u062A\u062D \u0648\u0627\u062A\u0633\u0627\u0628 \u0648\u0627\u0628\u062F\u0623.", href: "/ar/features/zero-friction" },
  { icon: "\uD83E\uDDE0", title: "\u0630\u0627\u0643\u0631\u0629 \u0634\u062E\u0635\u064A\u0629", desc: "\u063A\u0627\u0644\u064A \u064A\u062A\u0639\u0644\u0645 \u062A\u0641\u0636\u064A\u0644\u0627\u062A\u0643 \u0648\u0633\u064A\u0627\u0642\u0643 \u0648\u0623\u0633\u0644\u0648\u0628\u0643 \u0645\u0639 \u0627\u0644\u0648\u0642\u062A.", href: "/ar/features/personal-memory" },
  { icon: "\uD83D\uDD12", title: "\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0623\u0648\u0644\u0627\u064B", desc: "\u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0645\u0644\u0643\u0643. \u0634\u0648\u0641\u0647\u0627\u060C \u0627\u0645\u0633\u062D\u0647\u0627\u060C \u062A\u062D\u0643\u0645 \u0641\u064A\u0647\u0627. \u0645\u0627 \u0646\u0628\u064A\u0639\u0647\u0627 \u0623\u0628\u062F\u0627\u064B.", href: "/ar/features/privacy" },
  { icon: "\u26A1", title: "\u0645\u062F\u0639\u0648\u0645 \u0628\u0623\u0641\u0636\u0644 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A", desc: "Google Gemini \u0648Anthropic Claude \u0648OpenAI \u2014 \u0627\u0644\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u0644\u0643\u0644 \u0645\u0647\u0645\u0629.", href: "/ar/features/smart-ai" },
  { icon: "\uD83D\uDC41\uFE0F", title: "\u064A\u0641\u0647\u0645 \u0623\u064A \u0634\u064A", desc: "\u0627\u0631\u0633\u0644 \u0635\u0648\u0631\u060C \u0631\u0633\u0627\u0626\u0644 \u0635\u0648\u062A\u064A\u0629\u060C \u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A\u060C \u0635\u0648\u062A \u2014 \u063A\u0627\u0644\u064A \u064A\u0634\u0648\u0641 \u0648\u064A\u0633\u0645\u0639 \u0643\u0644 \u0634\u064A.", href: "/ar/features/understand-anything" },
  { icon: "\uD83C\uDFA8", title: "\u0625\u0646\u0634\u0627\u0621 \u0635\u0648\u0631", desc: "\u0648\u0635\u0651\u0641 \u0627\u0644\u0644\u064A \u062A\u0628\u064A\u0647 \u0648\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u0635\u0648\u0631\u0629 \u0645\u0630\u0647\u0644\u0629 \u062E\u0644\u0627\u0644 \u062B\u0648\u0627\u0646\u064A.", href: "/ar/features/image-generation" },
  { icon: "\uD83D\uDCC4", title: "\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0648\u0645\u0639\u0631\u0641\u0629", desc: "\u0627\u0631\u0633\u0644 PDF \u0648\u0645\u0644\u0641\u0627\u062A. \u063A\u0627\u0644\u064A \u064A\u0642\u0631\u0623\u0647\u0627\u060C \u064A\u062C\u0627\u0648\u0628 \u0623\u0633\u0626\u0644\u0629\u060C \u0648\u064A\u062A\u0630\u0643\u0631\u0647\u0627.", href: "/ar/features/documents" },
  { icon: "\u23F0", title: "\u0645\u0647\u0627\u0645 \u0645\u062C\u062F\u0648\u0644\u0629", desc: "\u0645\u0647\u0627\u0645 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062A\u0634\u062A\u063A\u0644 \u062D\u0633\u0628 \u062C\u062F\u0648\u0644 \u2014 \u062A\u0630\u0643\u064A\u0631\u0627\u062A\u060C \u0645\u0644\u062E\u0635\u0627\u062A\u060C \u062A\u0642\u0627\u0631\u064A\u0631 \u062F\u0648\u0631\u064A\u0629.", href: "/ar/features/scheduled-tasks" },
  { icon: "\uD83D\uDCCA", title: "\u062A\u0627\u0628\u0639 \u0643\u0644 \u0634\u064A", desc: "\u0645\u0635\u0627\u0631\u064A\u0641\u060C \u0645\u0647\u0627\u0645\u060C \u062C\u0647\u0627\u062A \u0627\u062A\u0635\u0627\u0644\u060C \u0645\u0644\u0627\u062D\u0638\u0627\u062A\u060C \u0625\u0634\u0627\u0631\u0627\u062A \u0645\u0631\u062C\u0639\u064A\u0629 \u2014 \u0628\u0633 \u0642\u0648\u0644\u0647 \u0648\u063A\u0627\u0644\u064A \u064A\u0646\u0638\u0645\u0647.", href: "/ar/features/track-everything" },
  { icon: "\u270D\uFE0F", title: "ProWrite", desc: "\u062E\u0637 \u0625\u0646\u062A\u0627\u062C \u0643\u062A\u0627\u0628\u0629 \u0627\u062D\u062A\u0631\u0627\u0641\u064A \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0646\u0645\u0627\u0630\u062C. 8 \u062E\u0637\u0648\u0627\u062A \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062A\u0628\u062D\u062B \u0648\u062A\u0643\u062A\u0628 \u0648\u062A\u0635\u0642\u0644 \u0645\u062D\u062A\u0648\u0627\u0643.", href: "/ar/features/prowrite" },
  { icon: "\uD83D\uDD13", title: "\u0645\u0641\u062A\u0648\u062D \u0627\u0644\u0645\u0635\u062F\u0631", desc: "\u0643\u0648\u062F\u0646\u0627 \u0639\u0627\u0645. \u062A\u0642\u062F\u0631 \u062A\u062A\u062D\u0642\u0642 \u0628\u0627\u0644\u0636\u0628\u0637 \u0643\u064A\u0641 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u062A\u064F\u0639\u0627\u0644\u062C.", href: "/ar/features/open-source" },
];

export default function ArFeaturesPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0f1e] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/ar" className="flex items-center gap-3">
            <Image src="/ghali-logo-no-bg.svg" alt="Ghali" width={36} height={36} />
            <span className="text-xl font-semibold tracking-tight">Ghali</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/features"
              className="text-sm text-white/40 transition-colors hover:text-white"
            >
              EN
            </Link>
            <CtaButton
              href={ar.whatsappUrl}
              location="features_nav_ar"
              className="flex items-center gap-2 rounded-full bg-[#ED6B23] px-5 py-2.5 text-sm font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
            >
              {"\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629"}
            </CtaButton>
          </div>
        </div>
      </nav>

      <section className="relative px-6 pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="pointer-events-none absolute top-0 left-1/2 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl md:text-6xl">
            {"\u0643\u0644 \u0634\u064A"} <span className="text-[#ED6B23]">{"\u063A\u0627\u0644\u064A"}</span> {"\u064A\u0642\u062F\u0631 \u064A\u0633\u0648\u064A\u0647"}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/50">
            {"\u0645\u0633\u0627\u0639\u062F \u0648\u0627\u062D\u062F\u060C \u0645\u062F\u0639\u0648\u0645 \u0628\u0623\u0641\u0636\u0644 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A\u060C \u064A\u0648\u0635\u0644\u0643 \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628. \u0647\u0630\u0627 \u0627\u0644\u0644\u064A \u0641\u064A\u0647."}
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]"
            >
              <div className="mb-4 text-3xl">{f.icon}</div>
              <h2 className="text-xl font-semibold">{f.title}</h2>
              <p className="mt-2 text-white/50 leading-relaxed">{f.desc}</p>
              <span className="mt-4 inline-block text-sm text-[#ED6B23] transition-transform group-hover:-translate-x-1">
                {"\u0627\u0639\u0631\u0641 \u0623\u0643\u062B\u0631"} &larr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Footer t={ar} />
      <StickyWhatsAppCta t={ar} />
    </div>
  );
}
