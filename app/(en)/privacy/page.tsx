import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Ghali handles your data. Your privacy matters to us. Learn about data collection, AI processing, and your rights.",
  alternates: {
    canonical: "https://ghali.ae/privacy",
    languages: {
      en: "https://ghali.ae/privacy",
      ar: "https://ghali.ae/ar/privacy",
      "x-default": "https://ghali.ae/privacy",
    },
  },
  openGraph: {
    title: "Privacy Policy — Ghali",
    description:
      "How Ghali handles your data. Your privacy matters to us. Learn about data collection, AI processing, and your rights.",
    url: "https://ghali.ae/privacy",
    locale: "en_AE",
    images: [
      {
        url: "/ghali-logo-with-bg.png",
        width: 640,
        height: 640,
        alt: "Ghali — AI Assistant on WhatsApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — Ghali",
    description:
      "How Ghali handles your data. Your privacy matters to us. Learn about data collection, AI processing, and your rights.",
    images: ["/ghali-logo-with-bg.png"],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ghali.ae" },
    { "@type": "ListItem", position: 2, name: "Privacy Policy", item: "https://ghali.ae/privacy" },
  ],
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/ghali-logo-no-bg.svg"
                alt="Ghali"
                width={30}
                height={30}
              />
              <span className="text-xl font-semibold tracking-tight">Ghali</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/ar/privacy"
                className="text-sm text-white/40 transition-colors hover:text-white"
              >
                عربي
              </Link>
              <Link
                href="/"
                className="text-sm text-white/40 transition-colors hover:text-white"
              >
                &larr; Back to home
              </Link>
            </div>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Privacy Policy
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-white/30 text-sm mb-6">
          Last updated: February 22, 2026
        </p>

        {/* Company banner */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 mb-8">
          <p className="text-white/70 leading-relaxed mb-3">
            This Privacy Policy governs the use of ghali.ae, a product owned and operated by{" "}
            <strong className="text-white">SAHEM DATA TECHNOLOGY</strong>, a company registered in Dubai, United Arab Emirates.
          </p>
          <p className="text-white/40 text-sm">
            Contact: <a href="mailto:support@ghali.ae" className="text-[#ED6B23] hover:underline">support@ghali.ae</a> | Villa 49, Street 38B, Barsha 2, Dubai, UAE
          </p>
        </div>

        <div className="space-y-8">
          <Section title="1. Introduction">
            <p>
              Welcome to ghali.ae. <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> respects your privacy and is committed to protecting your personal data.
              This privacy policy explains how we collect, use, and safeguard your information when you use our AI assistant service.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p className="mb-3">
              <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> collects information that you provide directly to us:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white/80">Account Information:</strong> Phone number and profile name from WhatsApp</li>
              <li><strong className="text-white/80">Conversation Data:</strong> Messages, voice notes, and files you share with the AI assistant</li>
              <li><strong className="text-white/80">Knowledge Base:</strong> Documents you send that are stored for future retrieval</li>
              <li><strong className="text-white/80">Usage Data:</strong> How you interact with our service, including features used and preferences</li>
              <li><strong className="text-white/80">Memory &amp; Personality:</strong> Preferences and context Ghali learns from your conversations</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p className="mb-3">We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve our AI assistant service</li>
              <li>Process your requests and deliver responses</li>
              <li>Store and retrieve your documents from your personal knowledge base</li>
              <li>Personalize your experience based on your preferences and memory</li>
              <li>Send service-related communications and proactive check-ins</li>
              <li>Analyze usage patterns to improve our service</li>
              <li>Protect against fraud and abuse</li>
            </ul>
          </Section>

          <Section title="4. AI Processing">
            <p>
              Your conversations are processed by third-party AI providers (Google, Anthropic, OpenAI) to generate responses.
              We do not use your conversation data to train AI models. Each provider has their own privacy policies
              regarding data handling during inference.
            </p>
          </Section>

          <Section title="5. Data Storage and Security">
            <p>
              Your data is stored securely using industry-standard encryption. We use Convex for real-time database
              storage and implement appropriate technical and organizational measures to protect your personal information.
            </p>
          </Section>

          <Section title="6. Data Sharing">
            <p className="mb-3">We do not sell your personal data. We may share information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white/80">AI Providers:</strong> To process your requests (Google, Anthropic, OpenAI)</li>
              <li><strong className="text-white/80">Service Providers:</strong> For authentication (Clerk), analytics (PostHog), and infrastructure</li>
              <li><strong className="text-white/80">Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </Section>

          <Section title="7. Your Rights">
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data — send &quot;my memory&quot; to see what Ghali knows about you</li>
              <li>Correct inaccurate data through conversation</li>
              <li>Delete your data — send &quot;clear memory&quot;, &quot;clear documents&quot;, or &quot;clear everything&quot;</li>
              <li>Opt out of analytics tracking</li>
            </ul>
          </Section>

          <Section title="8. Cookies and Tracking">
            <p>
              We use essential cookies for authentication and session management on our website. We use PostHog for anonymous
              analytics to understand how users interact with our service. You can opt out of analytics tracking
              in your browser settings.
            </p>
          </Section>

          <Section title="9. Data Retention">
            <p>
              We retain your conversation history and knowledge base data until you delete them.
              Media attachments are automatically deleted after 90 days. You can delete all your data at any time
              by sending &quot;clear everything&quot; to Ghali.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by
              posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              If you have questions about this privacy policy or our data practices, please contact <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> at{" "}
              <a href="mailto:support@ghali.ae" className="text-[#ED6B23] hover:underline">
                support@ghali.ae
              </a>
              {" "}or visit our office at Villa 49, Street 38B, Barsha 2, Dubai, UAE.
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-sm text-white/30">
            See also: <Link href="/terms" className="text-[#ED6B23] hover:underline">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3 text-white">{title}</h2>
      <div className="text-white/50 leading-relaxed">{children}</div>
    </section>
  );
}
