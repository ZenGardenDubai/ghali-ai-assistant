import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "Open Source AI Assistant — Ghali on GitHub",
  description:
    "Ghali's code is public. See exactly how your data is handled. No black boxes.",
  alternates: {
    canonical: "https://ghali.ae/features/open-source",
    languages: { en: "https://ghali.ae/features/open-source", ar: "https://ghali.ae/ar/features/open-source", "x-default": "https://ghali.ae/features/open-source" },
  },
  openGraph: {
    title: "Open Source — Ghali",
    description:
      "Ghali's code is public. See exactly how your data is handled. No black boxes.",
    url: "https://ghali.ae/features/open-source",
    locale: "en_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "Ghali — AI Assistant on WhatsApp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Open Source — Ghali",
    description:
      "Ghali's code is public. See exactly how your data is handled. No black boxes.",
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
    { "@type": "ListItem", position: 3, name: "Open Source", item: "https://ghali.ae/features/open-source" },
  ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
    { "@type": "Question", name: "Is Ghali really open source?", acceptedAnswer: { "@type": "Answer", text: "Yes. Ghali's entire codebase is publicly available on GitHub under the Apache 2.0 license. You can read every line of code." } },
    { "@type": "Question", name: "Where can I find the source code?", acceptedAnswer: { "@type": "Answer", text: "Visit github.com/ZenGardenDubai/ghali-ai-assistant to see the complete codebase, including how data is processed and stored." } },
    { "@type": "Question", name: "Can I contribute to Ghali?", acceptedAnswer: { "@type": "Answer", text: "Yes! Ghali welcomes contributions. Check the GitHub repository for contribution guidelines and open issues." } },
      ],
    },
  ],
};

export default function OpenSourcePage() {
  return (
    <FeaturePage
      jsonLd={pageJsonLd}
      slug="open-source"
      alternateLocaleHref="/ar/features/open-source"
      badge="Open Source"
      title={<>Built in <span className="text-[#ED6B23]">the Open</span></>}
      subtitle="Ghali's code is public on GitHub. You don't have to trust us — you can verify us."
    >
      <FeatureSection title="Why open source?">
        <p>
          When an AI assistant handles your personal conversations, documents, and memories — you deserve to know exactly what&apos;s happening under the hood.
        </p>
        <p>
          We don&apos;t think &quot;trust us&quot; is good enough. So we made the code public. Every line. Every decision. Every data flow. Read it yourself.
        </p>
      </FeatureSection>

      <FeatureSection title="What this means for you">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="🔍"
            title="Full transparency"
            description="See exactly how your data is stored, processed, and protected. No hidden surprises."
          />
          <FeatureCard
            icon="🛡️"
            title="Security by openness"
            description="Open code means more eyes catching bugs. Security through obscurity is no security at all."
          />
          <FeatureCard
            icon="🤝"
            title="Community trust"
            description="Developers, security researchers, and users can audit the code. Accountability built in."
          />
          <FeatureCard
            icon="📖"
            title="Learn from it"
            description="Building your own AI assistant? Learn from our architecture, patterns, and decisions."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="What you'll find on GitHub">
        <p>
          The full Ghali codebase — the WhatsApp integration, the AI agent, the credit system, the memory system, document processing, image generation, the landing page you&apos;re looking at right now. All of it.
        </p>
        <p>
          Licensed under Apache 2.0, which means you can read it, learn from it, and even build on it.
        </p>
      </FeatureSection>

      <FeatureSection>
        <a
          href="https://github.com/ZenGardenDubai/ghali-ai-assistant"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-white transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          <span className="text-lg font-semibold">View on GitHub &rarr;</span>
        </a>
      </FeatureSection>
    </FeaturePage>
  );
}
