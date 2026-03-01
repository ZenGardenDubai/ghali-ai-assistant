import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "No App Needed — AI Assistant on WhatsApp",
  description:
    "No app to install. No account to create. Just open WhatsApp and start chatting with Ghali.",
  alternates: {
    canonical: "https://ghali.ae/features/zero-friction",
    languages: { en: "https://ghali.ae/features/zero-friction", ar: "https://ghali.ae/ar/features/zero-friction", "x-default": "https://ghali.ae/features/zero-friction" },
  },
  openGraph: {
    title: "Zero Friction — Ghali",
    description:
      "No app to install. No account to create. Just open WhatsApp and start chatting with Ghali.",
    url: "https://ghali.ae/features/zero-friction",
    locale: "en_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "Ghali — AI Assistant on WhatsApp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zero Friction — Ghali",
    description:
      "No app to install. No account to create. Just open WhatsApp and start chatting with Ghali.",
    images: ["/ghali-logo-with-bg.png"],
  },
};

const pageJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ghali.ae" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://ghali.ae/features" },
    { "@type": "ListItem", position: 3, name: "Zero Friction", item: "https://ghali.ae/features/zero-friction" },
  ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
    { "@type": "Question", name: "Do I need to install an app to use Ghali?", acceptedAnswer: { "@type": "Answer", text: "No. Ghali works entirely through WhatsApp. Just send a message to +971 58 289 6090 and start chatting." } },
    { "@type": "Question", name: "Do I need to create an account?", acceptedAnswer: { "@type": "Answer", text: "No account, no signup, no password. Your WhatsApp number is your identity. Just message and go." } },
    { "@type": "Question", name: "Is Ghali free to use?", acceptedAnswer: { "@type": "Answer", text: "Yes. The Basic plan gives you 60 free messages every month. No credit card required." } },
      ],
    },
  ],
};

export default function ZeroFrictionPage() {
  return (
    <FeaturePage
      jsonLd={pageJsonLd}
      slug="zero-friction"
      alternateLocaleHref="/ar/features/zero-friction"
      badge="Zero Friction"
      title={<>No App. No Account. <span className="text-[#ED6B23]">Just WhatsApp.</span></>}
      subtitle="Other AI assistants want you to download an app, create an account, pick a plan, and figure out a new interface. Ghali just works."
    >
      <FeatureSection title="Open WhatsApp. Say Hi. Done.">
        <p>
          That&apos;s literally it. You already have WhatsApp on your phone. You already know how to send a message. There&apos;s nothing new to learn, nothing to install, nothing to update.
        </p>
        <p>
          Ghali lives where you already are. No new app taking up storage. No login screens. No &quot;please update to the latest version&quot; popups.
        </p>
      </FeatureSection>

      <FeatureSection title="Why this matters">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="📱"
            title="No download required"
            description="Works on any phone with WhatsApp. Android, iPhone, even WhatsApp Web."
          />
          <FeatureCard
            icon="🔑"
            title="No account to create"
            description="Your WhatsApp number is your identity. No passwords, no email verification."
          />
          <FeatureCard
            icon="🔄"
            title="No updates to install"
            description="Ghali improves on our end. You always get the latest version automatically."
          />
          <FeatureCard
            icon="🌍"
            title="Works everywhere"
            description="WhatsApp works on slow connections, old phones, and in every country. So does Ghali."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="Compare that to other AI assistants">
        <p>
          ChatGPT needs an app or a browser. Google Gemini needs a Google account. Every other AI assistant adds friction between you and the answer you need.
        </p>
        <p>
          Ghali removes all of it. The best assistant is the one you actually use — and you&apos;re way more likely to use something that&apos;s already in your pocket.
        </p>
      </FeatureSection>
    </FeaturePage>
  );
}
