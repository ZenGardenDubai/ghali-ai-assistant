import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "ProWrite",
  description:
    "Professional multi-AI writing pipeline. 8 models research, draft, and polish your content — articles, emails, reports, and more.",
  alternates: {
    canonical: "https://ghali.ae/features/prowrite",
    languages: { en: "https://ghali.ae/features/prowrite", ar: "https://ghali.ae/ar/features/prowrite" },
  },
  openGraph: {
    title: "ProWrite — Ghali",
    description:
      "Professional multi-AI writing pipeline. 8 models research, draft, and polish your content — articles, emails, reports, and more.",
    url: "https://ghali.ae/features/prowrite",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "Ghali — AI Assistant on WhatsApp" }],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ghali.ae" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://ghali.ae/features" },
    { "@type": "ListItem", position: 3, name: "ProWrite", item: "https://ghali.ae/features/prowrite" },
  ],
};

export default function ProWritePage() {
  return (
    <FeaturePage
      jsonLd={breadcrumbJsonLd}
      badge="ProWrite"
      title={<>Write Like a Pro. <span className="text-[#ED6B23]">8 AI Models Deep.</span></>}
      subtitle="Say &ldquo;prowrite&rdquo; and Ghali orchestrates a full writing pipeline — research, drafting, editing, and voice-matching — across 8 sequential AI calls."
    >
      <FeatureSection title="How it works">
        <p>
          ProWrite isn&apos;t a single prompt. It&apos;s a pipeline. Your request passes through 8 specialized AI steps, each handled by the model best suited for that job.
        </p>
        <p>
          The result: content that&apos;s researched, well-structured, creatively polished, and sounds like you wrote it — not a machine.
        </p>
      </FeatureSection>

      <FeatureSection title="The pipeline">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="📋"
            title="Brief & clarify"
            description="Claude Opus parses your request into a creative brief and asks smart clarifying questions."
          />
          <FeatureCard
            icon="🔍"
            title="Research & enrich"
            description="Gemini Flash searches the web for facts, stats, and trends. Your stored documents are searched too."
          />
          <FeatureCard
            icon="🏗️"
            title="Synthesize & draft"
            description="Claude Opus builds a narrative arc, then Kimi K2.5 writes the full piece with natural flow."
          />
          <FeatureCard
            icon="✨"
            title="Elevate & humanize"
            description="GPT-5.2 sharpens hooks and creativity. Claude Opus strips AI artifacts and matches your voice."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="What you can write">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="💼"
            title="LinkedIn posts"
            description="Thought leadership, industry insights, career updates — professional and authentic."
          />
          <FeatureCard
            icon="📧"
            title="Emails & outreach"
            description="Cold emails, follow-ups, proposals — persuasive without being pushy."
          />
          <FeatureCard
            icon="📝"
            title="Articles & reports"
            description="Blog posts, whitepapers, research summaries — well-structured and data-backed."
          />
          <FeatureCard
            icon="🎯"
            title="Anything else"
            description="Newsletters, social media threads, speeches, cover letters — you name it."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="Skip if you want">
        <p>
          Don&apos;t feel like answering questions? Just say &ldquo;skip questions&rdquo; or &ldquo;just write it&rdquo; and ProWrite will use sensible defaults and get straight to writing.
        </p>
      </FeatureSection>

      <FeatureSection title="Same credit, premium result">
        <p>
          ProWrite costs 1 credit — the same as any message. The multi-model orchestration happens behind the scenes at no extra cost to you.
        </p>
      </FeatureSection>
    </FeaturePage>
  );
}
