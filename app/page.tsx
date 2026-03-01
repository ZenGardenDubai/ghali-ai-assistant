import type { Metadata } from "next";
import { en } from "./lib/i18n/translations";
import { Nav } from "./components/landing/nav";
import { Hero } from "./components/landing/hero";
import { Strengths } from "./components/landing/strengths";
import { HowItWorks } from "./components/landing/how-it-works";
import { Capabilities } from "./components/landing/capabilities";
import { ExploreFeatures } from "./components/landing/explore-features";
import { Pricing } from "./components/landing/pricing";
import { FaqSection } from "./components/landing/faq-section";
import { FinalCta } from "./components/landing/final-cta";
import { Footer } from "./components/landing/footer";
import { StickyWhatsAppCta } from "./components/landing/sticky-whatsapp-cta";

export const metadata: Metadata = {
  title: "Ghali — The UAE's Favourite AI Assistant on WhatsApp",
  description:
    "Ghali is a WhatsApp-first AI assistant. Chat, generate images, analyze documents, and more. No app to install — just message and go.",
  alternates: {
    canonical: "https://ghali.ae",
    languages: {
      en: "https://ghali.ae",
      ar: "https://ghali.ae/ar",
      "x-default": "https://ghali.ae",
    },
  },
  openGraph: {
    title: "Ghali — The UAE's Favourite AI Assistant on WhatsApp",
    description:
      "No app to install. No account to create. Just message Ghali on WhatsApp and get things done.",
    url: "https://ghali.ae",
    locale: "en_AE",
    images: [
      {
        url: "/ghali-logo-with-bg.png",
        width: 640,
        height: 640,
        alt: "Ghali — AI Assistant on WhatsApp",
      },
    ],
  },
};

const t = en;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://ghali.ae/#organization",
      name: "SAHEM DATA TECHNOLOGY",
      url: "https://ghali.ae",
      logo: {
        "@type": "ImageObject",
        url: "https://ghali.ae/ghali-logo-with-bg.png",
        width: 640,
        height: 640,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@ghali.ae",
        contactType: "customer support",
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: "Villa 49, Street 38B, Barsha 2",
        addressLocality: "Dubai",
        addressCountry: "AE",
      },
      sameAs: ["https://github.com/ZenGardenDubai/ghali-ai-assistant"],
    },
    {
      "@type": "WebSite",
      "@id": "https://ghali.ae/#website",
      url: "https://ghali.ae",
      name: "Ghali",
      description:
        "Ghali is a WhatsApp-first AI assistant. Chat, generate images, analyze documents, and more.",
      publisher: { "@id": "https://ghali.ae/#organization" },
    },
    {
      "@type": "WebPage",
      "@id": "https://ghali.ae/#webpage",
      url: "https://ghali.ae",
      name: "Ghali — The UAE's Favourite AI Assistant on WhatsApp",
      description:
        "Ghali is a WhatsApp-first AI assistant. Chat, generate images, analyze documents, and more. No app to install — just message and go.",
      isPartOf: { "@id": "https://ghali.ae/#website" },
      about: { "@id": "https://ghali.ae/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Ghali",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "WhatsApp",
      offers: [
        {
          "@type": "Offer",
          name: "Basic",
          price: "0",
          priceCurrency: "USD",
          description: "60 messages per month, free forever",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "9.99",
          priceCurrency: "USD",
          description: "600 messages per month (10x Basic)",
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://ghali.ae",
        },
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

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* Subtle grid background */}
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
