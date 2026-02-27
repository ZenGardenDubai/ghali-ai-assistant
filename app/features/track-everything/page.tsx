import type { Metadata } from "next";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";

export const metadata: Metadata = {
  title: "Track Everything",
  description:
    "Track expenses, tasks, contacts, notes, and bookmarks with natural language. Smart search and automatic organization — all through WhatsApp.",
  alternates: { canonical: "https://ghali.ae/features/track-everything" },
  openGraph: {
    title: "Track Everything — Ghali",
    description:
      "Track expenses, tasks, contacts, notes, and bookmarks with natural language. Smart search and automatic organization — all through WhatsApp.",
    url: "https://ghali.ae/features/track-everything",
    images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "Ghali — AI Assistant on WhatsApp" }],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ghali.ae" },
    { "@type": "ListItem", position: 2, name: "Features", item: "https://ghali.ae/features" },
    { "@type": "ListItem", position: 3, name: "Track Everything", item: "https://ghali.ae/features/track-everything" },
  ],
};

export default function TrackEverythingPage() {
  return (
    <FeaturePage
      jsonLd={breadcrumbJsonLd}
      badge="Structured Data"
      title={<>Track <span className="text-[#ED6B23]">Everything</span> in One Place</>}
      subtitle="Expenses, tasks, contacts, notes — tell Ghali and it organizes, searches, and reminds automatically."
    >
      <FeatureSection title="Just tell Ghali">
        <p>
          &quot;I spent 45 AED on lunch at Shake Shack.&quot; &quot;Add a task: finish the quarterly report by Friday.&quot; &quot;Save Ahmad&apos;s number: +971501234567.&quot; &quot;Bookmark this article about AI trends.&quot;
        </p>
        <p>
          No forms, no apps, no categories to pick from. Just say what happened and Ghali figures out the rest — type, tags, amounts, dates, everything.
        </p>
      </FeatureSection>

      <FeatureSection title="What you can track">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="💰"
            title="Expenses"
            description="Amounts, currencies, tags, and categories. Track spending as it happens."
          />
          <FeatureCard
            icon="✅"
            title="Tasks"
            description="Status, due dates, and priority. Mark done when you're finished."
          />
          <FeatureCard
            icon="👤"
            title="Contacts"
            description="Names, phone numbers, and notes. Your personal address book."
          />
          <FeatureCard
            icon="📝"
            title="Notes"
            description="Freeform text, tagged and searchable. Capture ideas on the go."
          />
          <FeatureCard
            icon="🔖"
            title="Bookmarks"
            description="URLs, descriptions, and tags. Save links for later."
          />
          <FeatureCard
            icon="🏃"
            title="Habits"
            description="Track streaks and progress. Build consistency over time."
          />
        </div>
      </FeatureSection>

      <FeatureSection title="Smart search that understands you">
        <p>
          &quot;Show me what I spent on food last week&quot; works even if you tagged things as &quot;lunch&quot;, &quot;dinner&quot;, or &quot;groceries.&quot; Ghali combines exact text matching with semantic vector search — it understands meaning, not just keywords.
        </p>
        <p>
          Ask in any way that feels natural. &quot;What did I save about AI?&quot; &quot;Find my tasks due this week.&quot; &quot;How much did I spend in January?&quot; Ghali finds it.
        </p>
      </FeatureSection>

      <FeatureSection title="Collections keep you organized">
        <p>
          Items are automatically grouped into collections — or you can create your own. &quot;Create a collection called Travel Planning&quot; and start adding items to it.
        </p>
        <p>
          Need a summary? &quot;How much did I spend this month?&quot; &quot;Show my tasks by tag.&quot; &quot;Count my bookmarks.&quot; Ghali aggregates, groups, and totals across your data instantly.
        </p>
      </FeatureSection>

      <FeatureSection title="Attach reminders to anything">
        <p>
          Any item can have a due date and a reminder. &quot;Add a task: dentist appointment tomorrow at 9am, remind me.&quot; Ghali saves the item and sends you a reminder right on time.
        </p>
        <p>
          Combine tracking with scheduling — expenses with payment deadlines, tasks with follow-ups, contacts with birthdays. Everything in one place.
        </p>
      </FeatureSection>

      <FeatureSection>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="text-sm text-white/60">
            Searching and viewing items is free. Adding or updating items costs 1 credit (part of the message). Basic plan: 200 items, 10 collections. Pro plan: unlimited.
          </p>
        </div>
      </FeatureSection>
    </FeaturePage>
  );
}
