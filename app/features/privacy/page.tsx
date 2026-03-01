import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "Privacy First AI — Your Data Stays Yours",
  description:
    "Your data is yours. We don't sell it, we don't share it, and you can delete it anytime.",
  alternates: {
    canonical: "https://ghali.ae/features/privacy",
    languages: {
      en: "https://ghali.ae/features/privacy",
      ar: "https://ghali.ae/ar/features/privacy",
      "x-default": "https://ghali.ae",
    },
  },
  openGraph: {
    title: "Privacy First AI — Your Data Stays Yours",
    description:
      "Your data is yours. We don't sell it, we don't share it, and you can delete it anytime.",
    url: "https://ghali.ae/features/privacy",
    locale: "en_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "Ghali — AI Assistant on WhatsApp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy First AI — Your Data Stays Yours",
    description: "Ghali never sells your data. Full transparency, delete anytime, no model training.",
    images: ["/ghali-logo-with-bg.png"],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ghali.ae" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://ghali.ae/features" },
    { "@type": "ListItem", position: 3, name: "Privacy & Your Data", item: "https://ghali.ae/features/privacy" },
  ],
};

export default function PrivacyFeaturePage() {
  return (
    <FeaturePage
      jsonLd={breadcrumbJsonLd}
      badge="Privacy First"
      title={<>Your Stuff <span className="text-[#ED6B23]">Stays Yours</span></>}
      subtitle="We don't sell your data. We don't use it for training. You can see everything we know about you, and delete it all in one message."
    >
      <FeatureSection title="Privacy isn't a feature. It's the default.">
        <p>
          A lot of AI companies say they care about privacy. We built Ghali so you don&apos;t have to take our word for it — you can verify it yourself.
        </p>
        <p>
          Your conversations are yours. Your documents are yours. Your memory and preferences are yours. We&apos;re just holding them for you, and you can take them back anytime.
        </p>
      </FeatureSection>

      <FeatureSection title="What this means in practice">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="🚫"
            title="No data selling"
            description="We will never sell your personal data. Our business model is subscriptions, not surveillance."
          />
          <FeatureCard
            icon="🔍"
            title="Full transparency"
            description='Say "my memory" to see everything Ghali knows about you. No hidden profiles.'
          />
          <FeatureCard
            icon="🗑️"
            title="Delete anytime"
            description='"Clear memory", "clear documents", or "clear everything" — your data is gone instantly.'
          />
          <FeatureCard
            icon="🔒"
            title="No model training"
            description="Your conversations are never used to train AI models. Not ours, not anyone's."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="AI providers we use">
        <p>
          Your messages are processed by Google, Anthropic, and OpenAI to generate responses. These providers have strict data handling policies — they don&apos;t use API data for model training.
        </p>
        <p>
          We also use Clerk for authentication and PostHog for anonymous analytics. You can opt out of analytics anytime.
        </p>
      </FeatureSection>

      <FeatureSection title="And yes, the code is open">
        <p>
          Ghali is open source. You can read every line of code and see exactly how your data is handled. No black boxes, no trust-me-bro. Just code you can audit yourself.
        </p>
      </FeatureSection>
    </FeaturePage>
  );
}
