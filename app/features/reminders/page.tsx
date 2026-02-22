import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "Reminders & Scheduling — Ghali",
  description: "Set precise reminders, recurring schedules, and get proactive check-ins — all through WhatsApp.",
};

export default function RemindersPage() {
  return (
    <FeaturePage
      badge="Reminders & Scheduling"
      title={<>Never Forget <span className="text-[#ED6B23]">Anything Again</span></>}
      subtitle="Tell Ghali to remind you, and it will. Exact times, recurring schedules, and proactive check-ins — your WhatsApp becomes your personal scheduler."
    >
      <FeatureSection title="Just say when">
        <p>
          &quot;Remind me to call Ahmad at 3pm tomorrow.&quot; &quot;Every Monday at 9am, remind me to review my goals.&quot; &quot;In 2 hours, tell me to check the oven.&quot;
        </p>
        <p>
          Ghali understands natural language scheduling. No forms to fill, no calendar apps to switch to. Just tell it what you need and when.
        </p>
      </FeatureSection>

      <FeatureSection title="What you can schedule">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="⏰"
            title="One-time reminders"
            description="Set a reminder for a specific date and time. Ghali messages you right on schedule."
          />
          <FeatureCard
            icon="🔁"
            title="Recurring schedules"
            description="Daily, weekly, custom patterns — set it once and Ghali keeps reminding you."
          />
          <FeatureCard
            icon="💓"
            title="Proactive check-ins"
            description="Ghali can reach out on its own — morning routines, habit tracking, daily reviews."
          />
          <FeatureCard
            icon="📋"
            title="List & manage"
            description="See all your pending reminders and cancel any you don't need anymore."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="Heartbeat — Ghali reaches out first">
        <p>
          Most assistants wait for you to ask. Ghali&apos;s heartbeat feature is different. Set up a routine — &quot;check in every morning at 7am&quot;, &quot;remind me about my water intake at noon&quot; — and Ghali proactively messages you.
        </p>
        <p>
          It&apos;s like having a personal assistant who actually follows up, not one who just waits for instructions.
        </p>
      </FeatureSection>

      <FeatureSection title="Timezone-aware">
        <p>
          Ghali detects your timezone from your phone number and respects it for all reminders. Living in Dubai but set a reminder for 9am? It&apos;ll fire at 9am Dubai time. No manual timezone config needed.
        </p>
      </FeatureSection>

      <FeatureSection>
        <div className="rounded-2xl border border-[#ED6B23]/20 bg-[#ED6B23]/5 p-6">
          <p className="text-sm text-[#ED6B23]">
            <strong>Pro feature:</strong> Precise reminders and proactive heartbeat check-ins are available on the Pro plan. Basic users get all other features.
          </p>
        </div>
      </FeatureSection>
    </FeaturePage>
  );
}
