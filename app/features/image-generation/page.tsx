import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "Image Generation",
  description:
    "Describe what you want and get a stunning image in seconds. Logos, art, visuals — all from a text message.",
  alternates: {
    canonical: "https://ghali.ae/features/image-generation",
    languages: { en: "https://ghali.ae/features/image-generation", ar: "https://ghali.ae/ar/features/image-generation" },
  },
  openGraph: {
    title: "Image Generation — Ghali",
    description:
      "Describe what you want and get a stunning image in seconds. Logos, art, visuals — all from a text message.",
    url: "https://ghali.ae/features/image-generation",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "Ghali — AI Assistant on WhatsApp" }],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ghali.ae" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://ghali.ae/features" },
    { "@type": "ListItem", position: 3, name: "Image Generation", item: "https://ghali.ae/features/image-generation" },
  ],
};

export default function ImageGenerationPage() {
  return (
    <FeaturePage
      jsonLd={breadcrumbJsonLd}
      badge="Image Generation"
      title={<>Describe It. <span className="text-[#ED6B23]">Get It.</span></>}
      subtitle="Tell Ghali what you want to see and get a stunning image delivered right in your WhatsApp chat. No design skills needed."
    >
      <FeatureSection title="From words to visuals in seconds">
        <p>
          Need a logo concept? A social media graphic? An illustration for a presentation? Just describe it in plain language and Ghali creates it for you.
        </p>
        <p>
          No need to learn Midjourney prompts or figure out Stable Diffusion settings. Just say what you want, the way you&apos;d explain it to a designer friend.
        </p>
      </FeatureSection>

      <FeatureSection title="What you can create">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="🎨"
            title="Art & illustrations"
            description="Digital art, paintings, illustrations in any style — realistic, cartoon, watercolor, you name it."
          />
          <FeatureCard
            icon="📱"
            title="Social media graphics"
            description="Eye-catching visuals for Instagram, Twitter, LinkedIn — ready to post."
          />
          <FeatureCard
            icon="💼"
            title="Business visuals"
            description="Logo concepts, presentation graphics, marketing materials — professional-looking results."
          />
          <FeatureCard
            icon="🎭"
            title="Creative & fun"
            description="Memes, avatars, gift ideas, fun visualizations — let your imagination run wild."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="Delivered right in WhatsApp">
        <p>
          The image shows up as a regular WhatsApp photo. Save it, share it, forward it — no extra steps. No need to download from a website or copy from another app.
        </p>
      </FeatureSection>

      <FeatureSection title="Powered by Gemini Pro">
        <p>
          Ghali uses Google&apos;s Gemini Pro for image generation. That means high-quality results, fast generation, and the ability to understand complex, detailed prompts.
        </p>
      </FeatureSection>
    </FeaturePage>
  );
}
