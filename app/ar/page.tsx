import type { Metadata } from "next";
import { ar } from "@/app/lib/i18n/translations";
import { Nav } from "@/app/components/landing/nav";
import { Hero } from "@/app/components/landing/hero";
import { Strengths } from "@/app/components/landing/strengths";
import { HowItWorks } from "@/app/components/landing/how-it-works";
import { Capabilities } from "@/app/components/landing/capabilities";
import { ExploreFeatures } from "@/app/components/landing/explore-features";
import { Pricing } from "@/app/components/landing/pricing";
import { FaqSection } from "@/app/components/landing/faq-section";
import { FinalCta } from "@/app/components/landing/final-cta";
import { Footer } from "@/app/components/landing/footer";
import { StickyWhatsAppCta } from "@/app/components/landing/sticky-whatsapp-cta";

export const metadata: Metadata = {
  title: "\u063A\u0627\u0644\u064A \u2014 \u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0630\u0643\u064A \u0627\u0644\u0645\u0641\u0636\u0651\u0644 \u0641\u064A \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628",
  description:
    "\u063A\u0627\u0644\u064A \u0645\u0633\u0627\u0639\u062F \u0630\u0643\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628. \u062F\u0631\u062F\u0634\u060C \u0623\u0646\u0634\u0626 \u0635\u0648\u0631\u060C \u062D\u0644\u0651\u0644 \u0645\u0633\u062A\u0646\u062F\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u0632\u064A\u062F. \u0628\u062F\u0648\u0646 \u062A\u0637\u0628\u064A\u0642 \u2014 \u0628\u0633 \u0631\u0627\u0633\u0644 \u0648\u0627\u0628\u062F\u0623.",
  alternates: {
    canonical: "https://ghali.ae/ar",
    languages: {
      en: "https://ghali.ae",
      ar: "https://ghali.ae/ar",
      "x-default": "https://ghali.ae",
    },
  },
  openGraph: {
    title: "\u063A\u0627\u0644\u064A \u2014 \u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0630\u0643\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628",
    description:
      "\u0628\u062F\u0648\u0646 \u062A\u0637\u0628\u064A\u0642. \u0628\u062F\u0648\u0646 \u062D\u0633\u0627\u0628. \u0628\u0633 \u0631\u0627\u0633\u0644 \u063A\u0627\u0644\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628 \u0648\u062E\u0644\u0651\u0635 \u0634\u063A\u0644\u0643.",
    url: "https://ghali.ae/ar",
    locale: "ar_AE",
    images: [
      {
        url: "/ghali-logo-with-bg.png",
        width: 640,
        height: 640,
        alt: "\u063A\u0627\u0644\u064A \u2014 \u0645\u0633\u0627\u0639\u062F \u0630\u0643\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628",
      },
    ],
  },
};

const t = ar;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://ghali.ae/ar#webpage",
      url: "https://ghali.ae/ar",
      name: "\u063A\u0627\u0644\u064A \u2014 \u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0630\u0643\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628",
      inLanguage: "ar",
      isPartOf: { "@id": "https://ghali.ae/#website" },
      about: { "@id": "https://ghali.ae/#organization" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629", item: "https://ghali.ae/ar" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: t.faq.items.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ],
};

export default function ArHome() {
  return (
    <div className="relative min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <Nav t={t} />
      <Hero t={t} />
      <Strengths t={t} />
      <HowItWorks t={t} />
      <Capabilities t={t} />
      <ExploreFeatures t={t} />
      <Pricing t={t} />
      <FaqSection t={t} />
      <FinalCta t={t} />
      <Footer t={t} />
      <StickyWhatsAppCta t={t} />
    </div>
  );
}
