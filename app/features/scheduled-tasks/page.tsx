import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "AI Scheduled Tasks & Reminders on WhatsApp",
  description:
    "Schedule AI-powered tasks that run automatically — reminders, daily briefings, recurring reports, and more.",
  alternates: {
    canonical: "https://ghali.ae/features/scheduled-tasks",
    languages: {
      en: "https://ghali.ae/features/scheduled-tasks",
      ar: "https://ghali.ae/ar/features/scheduled-tasks",
      "x-default": "https://ghali.ae",
    },
  },
  openGraph: {
    title: "AI Scheduled Tasks & Reminders on WhatsApp",
    description:
      "Schedule AI-powered tasks that run automatically — reminders, daily briefings, recurring reports, and more.",
    url: "https://ghali.ae/features/scheduled-tasks",
    locale: "en_AE",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "Ghali — AI Assistant on WhatsApp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Scheduled Tasks & Reminders on WhatsApp",
    description: "Schedule tasks and Ghali runs them automatically — reminders, briefings, and recurring reports.",
    images: ["/ghali-logo-with-bg.png"],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ghali.ae" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://ghali.ae/features" },
    { "@type": "ListItem", position: 3, name: "Scheduled Tasks", item: "https://ghali.ae/features/scheduled-tasks" },
  ],
};

export default function ScheduledTasksPage() {
  return (
    <FeaturePage
      jsonLd={breadcrumbJsonLd}
      badge="Scheduled Tasks"
      title={<>AI That Works <span className="text-[#ED6B23]">While You Sleep</span></>}
      subtitle="Schedule tasks and Ghali runs them automatically — a full AI turn with research, analysis, and rich results delivered straight to your WhatsApp."
    >
      <FeatureSection title="More than reminders">
        <p>
          Old-school reminders just repeat a message back to you. Ghali&apos;s scheduled tasks are different — each one triggers a full AI turn. Ghali thinks, researches, and delivers a rich result at the time you set.
        </p>
        <p>
          &quot;Every morning at 7am, give me a weather briefing for Dubai.&quot; &quot;At 5pm on Friday, summarize my week.&quot; &quot;Remind me to call Ahmad tomorrow at 3pm.&quot; — Ghali handles all of these.
        </p>
      </FeatureSection>

      <FeatureSection title="What you can schedule">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon="⏰"
            title="One-time tasks"
            description="Set a task for a specific date and time. Ghali runs it and delivers the result."
          />
          <FeatureCard
            icon="🔁"
            title="Recurring tasks"
            description="Daily briefings, weekly summaries, habit check-ins — set it once and Ghali keeps delivering."
          />
          <FeatureCard
            icon="🧠"
            title="Full AI power"
            description="Each task gets a full agent turn — web search, analysis, document recall, and more."
          />
          <FeatureCard
            icon="📋"
            title="List & manage"
            description="See all your tasks, pause, resume, edit, or delete them anytime."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="Examples">
        <div className="space-y-3">
          {[
            "\"Remind me to take my medication at 8am every day\"",
            "\"Every weekday at 9am, give me a news briefing about AI\"",
            "\"In 2 hours, remind me to check the oven\"",
            "\"Every Sunday at 6pm, help me plan my week\"",
            "\"Tomorrow at 3pm, remind me to call the dentist\"",
          ].map((example) => (
            <div
              key={example}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3 text-white/70"
            >
              {example}
            </div>
          ))}
        </div>
      </FeatureSection>

      <FeatureSection title="Heartbeat — Ghali reaches out first">
        <p>
          Beyond scheduled tasks, Ghali&apos;s heartbeat feature provides loose, proactive check-ins. Set up a routine — &quot;check in every morning about my goals&quot; — and Ghali reaches out on its own with hourly precision.
        </p>
        <p>
          Scheduled tasks are for specific times. Heartbeat is for general awareness. Together, they make Ghali a truly proactive assistant.
        </p>
      </FeatureSection>

      <FeatureSection title="Timezone-aware">
        <p>
          Ghali detects your timezone from your phone number and respects it for all scheduled tasks. Living in Dubai but set a task for 9am? It&apos;ll fire at 9am Dubai time. No manual timezone config needed.
        </p>
      </FeatureSection>

      <FeatureSection>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="text-sm text-white/60">
            Scheduled tasks and heartbeat check-ins are available to all users. Each task execution costs 1 credit. Basic users can have up to 3 scheduled tasks, Pro users up to 24.
          </p>
        </div>
      </FeatureSection>
    </FeaturePage>
  );
}
