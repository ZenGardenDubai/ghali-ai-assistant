import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "Personal Memory — Ghali",
  description: "Ghali remembers your preferences, your context, and your style. It gets smarter the more you use it.",
};

export default function PersonalMemoryPage() {
  return (
    <FeaturePage
      badge="Personal Memory"
      title={<>Gets Smarter <span className="text-[#ED6B23]">the More You Use It</span></>}
      subtitle="Most AI assistants forget everything between conversations. Ghali doesn't. It learns who you are, how you work, and what you care about."
    >
      <FeatureSection title="It actually remembers you">
        <p>
          Tell Ghali you like your coffee at 7am, that you work at ADNOC, or that you prefer concise answers. It remembers. Next time, it already knows.
        </p>
        <p>
          No more repeating yourself. No more &quot;as I mentioned before...&quot; — Ghali keeps a living memory of everything that matters about you.
        </p>
      </FeatureSection>

      <FeatureSection title="Three layers of personalization">
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon="🧠"
            title="Memory"
            description="Facts about you — your name, work, preferences, habits. Grows organically from conversation."
          />
          <FeatureCard
            icon="🎭"
            title="Personality"
            description="How Ghali talks to you — formal or casual, detailed or brief, emoji or no emoji. You shape it."
          />
          <FeatureCard
            icon="💓"
            title="Heartbeat"
            description="Proactive check-ins based on your routine. Ghali reaches out when it matters."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="You're always in control">
        <p>
          Want to see what Ghali knows about you? Just ask — say &quot;my memory&quot; and it&apos;ll show you everything. Want to change something? Just tell it. Want to erase it all? Say &quot;clear memory&quot; and it&apos;s gone.
        </p>
        <p>
          You can also shape Ghali&apos;s personality through conversation. &quot;Be more casual.&quot; &quot;Use less emoji.&quot; &quot;Always respond in Arabic.&quot; It adapts to you, not the other way around.
        </p>
      </FeatureSection>
    </FeaturePage>
  );
}
