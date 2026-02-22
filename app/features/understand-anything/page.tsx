import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "Understand Anything — Ghali",
  description: "Send photos, voice notes, videos, or audio — Ghali sees, hears, and understands it all.",
};

export default function UnderstandAnythingPage() {
  return (
    <FeaturePage
      badge="Multimodal"
      title={<>Send Anything. <span className="text-[#ED6B23]">Ghali Gets It.</span></>}
      subtitle="Photos, voice notes, videos, audio files — just send them in WhatsApp and Ghali understands what you're sharing."
    >
      <FeatureSection title="More than just text">
        <p>
          Real conversations aren&apos;t just words. You snap a photo of a menu. You record a quick voice note. You forward a video someone sent you. Ghali handles all of it — natively, through WhatsApp.
        </p>
      </FeatureSection>

      <FeatureSection title="What Ghali can understand">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="📸"
            title="Images"
            description="Send a photo and ask about it. Screenshots, documents, receipts, menus, signs — Ghali reads and describes them."
          />
          <FeatureCard
            icon="🎤"
            title="Voice notes"
            description="Too lazy to type? Just talk. Ghali transcribes your voice note and responds to what you said."
          />
          <FeatureCard
            icon="🎬"
            title="Videos"
            description="Forward a video and ask what's happening. Ghali watches it and gives you a summary or answers your questions."
          />
          <FeatureCard
            icon="🔊"
            title="Audio files"
            description="Podcasts, recordings, audio messages — send them over and Ghali listens and responds."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="It just works">
        <p>
          No special commands. No &quot;please analyze this image.&quot; Just send it the way you&apos;d send it to a friend — drop the photo, add a question if you want, and Ghali figures out the rest.
        </p>
        <p>
          Reply to a photo you sent earlier with a new question, and Ghali pulls it up and re-analyzes it. Context carries over naturally.
        </p>
      </FeatureSection>

      <FeatureSection title="Powered by Gemini's multimodal engine">
        <p>
          Under the hood, Ghali uses Google Gemini&apos;s native multimodal capabilities. That means images, audio, and video aren&apos;t converted to text first — the AI actually sees and hears them, giving you much better results than transcription-based approaches.
        </p>
      </FeatureSection>
    </FeaturePage>
  );
}
