import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "ProWrite — Professional Writing Pipeline",
  description:
    "Get polished, human-sounding articles in 3-4 minutes. Multi-model AI pipeline with clarifying questions and voice matching — all through WhatsApp.",
  alternates: { canonical: "https://ghali.ae/features/prowrite" },
  openGraph: {
    title: "ProWrite — Ghali",
    description:
      "Get polished, human-sounding articles in 3-4 minutes. Multi-model AI pipeline with clarifying questions and voice matching — all through WhatsApp.",
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

const PIPELINE_STEPS = [
  {
    icon: "📋",
    title: "Brief",
    description: "Claude Opus parses your request into a structured creative brief — topic, platform, audience, tone, and key angles.",
  },
  {
    icon: "❓",
    title: "Clarify",
    description: "3-5 targeted questions to sharpen the article. Examples, data to cite, desired boldness. Skip with 'skip questions'.",
  },
  {
    icon: "🔍",
    title: "Research",
    description: "Gemini with Google Search grounding finds real facts, stats, and recent developments about your topic.",
  },
  {
    icon: "🗂️",
    title: "RAG",
    description: "Searches your Memory Vault for relevant documents you've shared before, grounding the article in your knowledge.",
  },
  {
    icon: "🗺️",
    title: "Synthesize",
    description: "Claude Opus builds a detailed fact sheet, narrative arc, and section-by-section outline as the writing blueprint.",
  },
  {
    icon: "✍️",
    title: "Draft",
    description: "Kimi K2.5 writes the full article following the blueprint — natural voice, no AI clichés.",
  },
  {
    icon: "⚡",
    title: "Elevate",
    description: "GPT injects creativity at high temperature — sharper hooks, unexpected angles, bold conclusions.",
  },
  {
    icon: "✂️",
    title: "Refine",
    description: "Kimi K2.5 polishes coherence and flow — smooth transitions, tight sentences, consistent voice.",
  },
  {
    icon: "🎭",
    title: "Humanize",
    description: "Claude Opus strips all AI artifacts and rewrites in your exact voice profile — reads like you wrote it.",
  },
];

export default function ProWritePage() {
  return (
    <FeaturePage
      jsonLd={breadcrumbJsonLd}
      badge="Professional Writing"
      title={<><span className="text-[#ED6B23]">ProWrite</span> — Articles That Sound Like You</>}
      subtitle="A 9-step multi-model pipeline that turns your idea into a polished, human-sounding article in 3-4 minutes."
    >
      <FeatureSection title="How to use it">
        <p>
          Just start your message with <strong>prowrite</strong> followed by your request:
        </p>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 font-mono text-sm text-white/70">
          <p>prowrite a LinkedIn post about why government forms should disappear, 400 words</p>
        </div>
        <p>
          Ghali will generate a creative brief, ask 3-5 clarifying questions, then run the full pipeline and send you the finished article.
        </p>
        <p>
          In a hurry? Say <strong>skip questions</strong> and Ghali writes immediately with smart defaults.
        </p>
      </FeatureSection>

      <FeatureSection title="The 9-step pipeline">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE_STEPS.map((step) => (
            <FeatureCard
              key={step.title}
              icon={step.icon}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>
      </FeatureSection>

      <FeatureSection title="What it writes">
        <p>
          ProWrite handles any professional writing format:
        </p>
        <ul className="space-y-2 text-white/60">
          <li>• LinkedIn posts and articles</li>
          <li>• Blog posts and newsletters</li>
          <li>• Opinion pieces and thought leadership</li>
          <li>• Email campaigns and announcements</li>
          <li>• Executive communications</li>
          <li>• Press releases and company updates</li>
        </ul>
      </FeatureSection>

      <FeatureSection title="Voice matching">
        <p>
          The final Humanize step uses your voice profile — built from your conversation history and preferences — to match your exact writing style. Sentence length, vocabulary, tone, structure. The article reads like you wrote it, not like an AI did.
        </p>
        <p>
          The more you use Ghali, the more accurate your voice profile becomes.
        </p>
      </FeatureSection>

      <FeatureSection title="Example interaction">
        <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm">
          <div className="flex gap-3">
            <span className="shrink-0 font-semibold text-white/40">You</span>
            <p className="text-white/70">prowrite a LinkedIn post about why government forms should disappear, 400 words</p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 font-semibold text-[#ED6B23]">Ghali</span>
            <div className="text-white/70">
              <p>📝 <em>Here&apos;s what I&apos;m thinking:</em></p>
              <p className="mt-1">A LinkedIn post arguing that government forms are a symptom of broken process design, not a necessary tool. ~400 words, professional but direct tone.</p>
              <p className="mt-2">Before I start writing, a few questions:</p>
              <p>1. Do you want to reference specific forms you&apos;ve eliminated?</p>
              <p>2. Should I cite data or keep it opinion-driven?</p>
              <p>3. How bold should the closing be?</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 font-semibold text-white/40">You</span>
            <p className="text-white/70">Use ZB data, make the closing bold</p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 font-semibold text-[#ED6B23]">Ghali</span>
            <p className="text-white/70">Starting the writing pipeline now ✍️ This usually takes 3-4 minutes — I&apos;ll send you the final article when it&apos;s ready.</p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 font-semibold text-[#ED6B23]">Ghali</span>
            <p className="text-white/70 italic">[3-4 minutes later] Here&apos;s your article: [full text] ✅<br />Want any adjustments?</p>
          </div>
        </div>
      </FeatureSection>

      <FeatureSection>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="text-sm text-white/60">
            ProWrite costs 1 credit per article — the same as a regular message. Available on both Basic (60/month) and Pro (600/month) plans.
          </p>
        </div>
      </FeatureSection>
    </FeaturePage>
  );
}
