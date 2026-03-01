import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "Best AI Models — Google Gemini, Claude & OpenAI on WhatsApp",
  description:
    "Ghali uses Google Gemini, Anthropic Claude, and OpenAI — and automatically picks the best model for every task.",
  alternates: {
    canonical: "https://ghali.ae/features/smart-ai",
    languages: { en: "https://ghali.ae/features/smart-ai", ar: "https://ghali.ae/ar/features/smart-ai", "x-default": "https://ghali.ae/features/smart-ai" },
  },
  openGraph: {
    title: "Powered by the Best AI — Ghali",
    description:
      "Ghali uses Google Gemini, Anthropic Claude, and OpenAI — and automatically picks the best model for every task.",
    url: "https://ghali.ae/features/smart-ai",
    locale: "en_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "Ghali — AI Assistant on WhatsApp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Powered by the Best AI — Ghali",
    description:
      "Ghali uses Google Gemini, Anthropic Claude, and OpenAI — and automatically picks the best model for every task.",
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
    { "@type": "ListItem", position: 3, name: "Powered by the Best AI", item: "https://ghali.ae/features/smart-ai" },
  ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
    { "@type": "Question", name: "What AI models does Ghali use?", acceptedAnswer: { "@type": "Answer", text: "Ghali uses Google Gemini for fast everyday tasks, Anthropic Claude for deep analysis and writing, and OpenAI models — automatically picking the best one for each task." } },
    { "@type": "Question", name: "Do I need to choose which AI model to use?", acceptedAnswer: { "@type": "Answer", text: "No. Ghali automatically selects the best model for your request. About 85% of messages are handled by the fast model, while complex tasks get escalated to more powerful models." } },
    { "@type": "Question", name: "Can Ghali search the internet for current information?", acceptedAnswer: { "@type": "Answer", text: "Yes. Ghali has Google Search grounding, so it can look up real-time data like weather, news, prices, and sports scores." } },
      ],
    },
  ],
};

export default function SmartAiPage() {
  return (
    <FeaturePage
      jsonLd={pageJsonLd}
      slug="smart-ai"
      alternateLocaleHref="/ar/features/smart-ai"
      badge="Smart AI"
      title={<>Powered by <span className="text-[#ED6B23]">the Best AI</span></>}
      subtitle="Ghali doesn't lock you into one model. It uses Google Gemini, Anthropic Claude, and OpenAI — and picks the right one for every task, automatically."
    >
      <FeatureSection title="Why multiple models?">
        <p>
          No single AI model is the best at everything. Gemini is lightning fast for everyday questions. Claude excels at deep analysis and nuanced writing. Each has strengths.
        </p>
        <p>
          Ghali knows this. So instead of forcing everything through one model, it picks the best tool for the job — every single time, without you having to think about it.
        </p>
      </FeatureSection>

      <FeatureSection title="How it works">
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon="⚡"
            title="Fast & smart (85%)"
            description="Google Gemini handles most messages instantly — quick answers, search, everyday tasks."
          />
          <FeatureCard
            icon="🧠"
            title="Deep thinking (15%)"
            description="Complex analysis, coding, strategic planning, and premium writing get escalated to Claude Opus."
          />
          <FeatureCard
            icon="🎨"
            title="Image generation"
            description="When you need visuals, Gemini Pro creates stunning images from your descriptions."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="Deep thinking for the hard stuff">
        <p>
          Some questions need more than a quick answer. When you ask Ghali to analyze a complex document, plan a business strategy, write a detailed proposal, or debug code — it automatically escalates to a more powerful model.
        </p>
        <p>
          You don&apos;t need to ask for it. You don&apos;t need to switch modes. Ghali recognizes when a question deserves deeper thinking and brings in the heavy artillery.
        </p>
      </FeatureSection>

      <FeatureSection title="What deep thinking handles">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="📊"
            title="Analysis"
            description="Break down complex data, compare options, find patterns, make sense of messy information."
          />
          <FeatureCard
            icon="📋"
            title="Strategic planning"
            description="Business plans, project roadmaps, decision frameworks — structured thinking for real problems."
          />
          <FeatureCard
            icon="✍️"
            title="Premium writing"
            description="Proposals, reports, creative writing — when every word matters, you get the best model."
          />
          <FeatureCard
            icon="💻"
            title="Code & technical"
            description="Debugging, code review, architecture decisions — complex technical questions get the right brain."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="Real-time information too">
        <p>
          Ghali has access to Google Search grounding. That means it can look up today&apos;s weather, latest news, current prices, sports scores — anything that needs real-time data. No stale training data, no guessing.
        </p>
      </FeatureSection>
    </FeaturePage>
  );
}
