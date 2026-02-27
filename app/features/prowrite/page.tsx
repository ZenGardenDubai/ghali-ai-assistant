import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "ProWrite — Professional Writing Pipeline",
  description:
    "Write professional LinkedIn posts, blog articles, and more through an 8-model AI pipeline. Clarifying questions, web research, voice matching — delivered in 3-4 minutes.",
  alternates: { canonical: "https://ghali.ae/features/prowrite" },
  openGraph: {
    title: "ProWrite — Ghali",
    description:
      "Write professional LinkedIn posts, blog articles, and more through an 8-model AI pipeline. Clarifying questions, web research, voice matching — delivered in 3-4 minutes.",
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
    icon: "📝",
    title: "Brief",
    description: "Claude Opus parses your request into a detailed creative brief with angles, audience, and tone.",
  },
  {
    icon: "❓",
    title: "Clarify",
    description: "3-5 targeted questions about specific data, examples, and style preferences to include.",
  },
  {
    icon: "🔍",
    title: "Research",
    description: "Gemini searches the web for current stats, quotes, case studies, and sources relevant to your topic.",
  },
  {
    icon: "📚",
    title: "Your Documents",
    description: "Searches your uploaded documents for relevant content to ground the article in your own knowledge.",
  },
  {
    icon: "🗺️",
    title: "Outline",
    description: "Claude Opus synthesizes all research into a narrative arc, fact sheet, and detailed section-by-section outline.",
  },
  {
    icon: "✍️",
    title: "Draft",
    description: "Kimi K2 writes the full article following the brief and outline exactly.",
  },
  {
    icon: "✨",
    title: "Elevate",
    description: "A second model sharpens the opening hook, adds unexpected metaphors, and makes bold language choices.",
  },
  {
    icon: "🪄",
    title: "Humanize",
    description: "Claude Opus strips all AI patterns, matches your voice profile, and makes it sound completely human.",
  },
];

const USE_CASES = [
  { icon: "💼", title: "LinkedIn posts", description: "Thought leadership, personal stories, industry insights." },
  { icon: "📰", title: "Blog articles", description: "Long-form content with research and structured argument." },
  { icon: "📧", title: "Business emails", description: "Proposals, pitches, executive updates." },
  { icon: "🗣️", title: "Opinion pieces", description: "Op-eds, essays, commentary with a strong point of view." },
];

export default function ProWritePage() {
  return (
    <FeaturePage
      jsonLd={breadcrumbJsonLd}
      badge="ProWrite"
      title={<>Professional Writing, <span className="text-[#ED6B23]">Powered by 8 Models</span></>}
      subtitle="Say &ldquo;prowrite a LinkedIn post about X&rdquo; and get a research-backed, human-sounding article delivered in 3-4 minutes."
    >
      <FeatureSection title="How it works">
        <p>
          ProWrite is a multi-stage writing pipeline triggered by the word <strong>prowrite</strong>. Each stage uses the best model for that specific job — briefing, research, drafting, elevating, and humanizing are all done by different AI models.
        </p>
        <p>
          The result is an article that reads like a senior writer produced it — not like it came from a chatbot.
        </p>
      </FeatureSection>

      <FeatureSection title="The 8-step pipeline">
        <div className="grid gap-4 sm:grid-cols-2">
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

      <FeatureSection title="Voice matching">
        <p>
          The final step isn&apos;t just editing — it&apos;s impersonation. Ghali uses your personality profile (built up from conversations) to understand your sentence style, vocabulary preferences, and tone characteristics, then rewrites the article to match your voice.
        </p>
        <p>
          The more you use Ghali, the better it gets at writing in your voice.
        </p>
      </FeatureSection>

      <FeatureSection title="What you can write">
        <div className="grid gap-4 sm:grid-cols-2">
          {USE_CASES.map((uc) => (
            <FeatureCard
              key={uc.title}
              icon={uc.icon}
              title={uc.title}
              description={uc.description}
            />
          ))}
        </div>
      </FeatureSection>

      <FeatureSection title="Example">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4 font-mono text-sm">
          <div className="flex gap-3">
            <span className="text-white/30 shrink-0">You</span>
            <span className="text-white/80">prowrite a LinkedIn post about why government forms should disappear, 400 words</span>
          </div>
          <div className="flex gap-3">
            <span className="text-[#ED6B23] shrink-0">Ghali</span>
            <span className="text-white/60">
              Here&apos;s my thinking for your post: A LinkedIn post arguing that government forms are a symptom of broken process design. ~400 words, professional but direct.<br /><br />
              A few questions:<br />
              1. Any specific forms you&apos;ve eliminated or simplified?<br />
              2. Should I cite data or keep it opinion-driven?<br />
              3. How provocative should the closing be?
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-white/30 shrink-0">You</span>
            <span className="text-white/80">Use ZB data, make the closing bold</span>
          </div>
          <div className="flex gap-3">
            <span className="text-[#ED6B23] shrink-0">Ghali</span>
            <span className="text-white/60">Starting the writing pipeline now ✍️ This usually takes 3-4 minutes — I&apos;ll send you the final article when it&apos;s ready.</span>
          </div>
        </div>
      </FeatureSection>

      <FeatureSection title="Skip the questions">
        <p>
          In a hurry? Add &ldquo;skip questions&rdquo; to your request and ProWrite jumps straight to writing with sensible defaults.
        </p>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 font-mono text-sm text-white/70">
          prowrite a blog post about AI in healthcare, 600 words, skip questions
        </div>
      </FeatureSection>

      <FeatureSection>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="text-sm text-white/60">
            ProWrite costs 1 credit — same as any regular message. Available to both Basic and Pro users. Delivery typically takes 3-4 minutes.
          </p>
        </div>
      </FeatureSection>
    </FeaturePage>
  );
}
