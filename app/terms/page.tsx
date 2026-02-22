import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for ghali.ae — your rights, usage guidelines, credit system, and acceptable use policy.",
  alternates: {
    canonical: "https://ghali.ae/terms",
  },
  openGraph: {
    title: "Terms of Service — Ghali",
    description:
      "Terms of Service for ghali.ae — your rights, usage guidelines, credit system, and acceptable use policy.",
    url: "https://ghali.ae/terms",
    images: [
      {
        url: "/ghali-logo-with-bg.png",
        width: 640,
        height: 640,
        alt: "Ghali — AI Assistant on WhatsApp",
      },
    ],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://ghali.ae" },
    { "@type": "ListItem", position: 2, name: "Terms of Service", item: "https://ghali.ae/terms" },
  ],
};

export default function TermsPage() {
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
            <Link
              href="/"
              className="text-sm text-white/40 transition-colors hover:text-white"
            >
              &larr; Back to home
            </Link>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Terms of Service
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
            These Terms of Service constitute a legal agreement between you and{" "}
            <strong className="text-white">SAHEM DATA TECHNOLOGY</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;), the owner and operator of ghali.ae.
          </p>
          <p className="text-white/40 text-sm mb-2">
            <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> is registered in Dubai, United Arab Emirates.
          </p>
          <p className="text-white/40 text-sm">
            Address: Villa 49, Street 38B, Barsha 2, Dubai, UAE | Email: <a href="mailto:support@ghali.ae" className="text-[#ED6B23] hover:underline">support@ghali.ae</a>
          </p>
        </div>

        <div className="space-y-8">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using ghali.ae, you agree to be bound by these Terms of Service and enter into a legally binding agreement with <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong>.
              If you do not agree to these terms, please do not use our service.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              ghali.ae is an AI-powered WhatsApp assistant developed and operated by <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> that helps you get things done.
              The service includes conversational AI, document analysis, image generation, voice note transcription,
              personal knowledge base, and scheduling features powered by various AI providers.
            </p>
          </Section>

          <Section title="3. Account Registration">
            <p className="mb-3">To use ghali.ae, you must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be at least 18 years old or have parental consent</li>
              <li>Have a valid WhatsApp account</li>
              <li>Not use the service from a blocked region</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            <p className="mb-3">You agree not to use ghali.ae to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generate illegal, harmful, or abusive content</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Attempt to circumvent usage limits or security measures</li>
              <li>Share your account credentials with others</li>
              <li>Use automated systems to access the service without permission</li>
              <li>Generate content that promotes violence, discrimination, or harassment</li>
            </ul>
          </Section>

          <Section title="5. Credits and Usage">
            <p className="mb-3">ghali.ae operates on a credit-based system:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white/80">Basic Tier:</strong> Free users receive 60 credits per month</li>
              <li><strong className="text-white/80">Pro Tier:</strong> Paid subscribers receive 600 credits per month plus additional features</li>
              <li>Each message costs 1 credit; system commands are free</li>
              <li>Unused credits do not roll over between reset periods</li>
              <li>We reserve the right to modify credit allocations with notice</li>
            </ul>
          </Section>

          <Section title="6. Content Ownership">
            <p className="mb-3">Regarding content ownership:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white/80">Your Content:</strong> You retain ownership of content you upload or create</li>
              <li><strong className="text-white/80">AI-Generated Content:</strong> You own the output generated by AI based on your prompts</li>
              <li><strong className="text-white/80">License to Us:</strong> You grant us a license to process your content to provide the service</li>
              <li><strong className="text-white/80">Our Content:</strong> The ghali.ae service, branding, and technology remain our property</li>
            </ul>
          </Section>

          <Section title="7. AI Limitations">
            <p>
              AI-generated content may contain errors, inaccuracies, or inappropriate material.
              You are responsible for reviewing and verifying any AI output before relying on it.
              We do not guarantee the accuracy, completeness, or suitability of AI-generated content
              for any particular purpose.
            </p>
          </Section>

          <Section title="8. Third-Party Services">
            <p>
              ghali.ae integrates with third-party AI providers (Google, Anthropic, OpenAI) and other services.
              Your use of these integrated services is subject to their respective terms and policies.
              We are not responsible for the availability or performance of third-party services.
            </p>
          </Section>

          <Section title="9. Privacy">
            <p>
              Your use of ghali.ae is also governed by our{" "}
              <Link href="/privacy" className="text-[#ED6B23] hover:underline">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your personal information.
            </p>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <p>
              ghali.ae is provided &quot;as is&quot; without warranties of any kind. We do not warrant that the
              service will be uninterrupted, error-free, or secure. We disclaim all warranties,
              express or implied, including warranties of merchantability and fitness for a particular purpose.
            </p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages arising from your use of ghali.ae. Our total
              liability shall not exceed the amount you paid for the service in the past 12 months.
            </p>
          </Section>

          <Section title="12. Termination">
            <p>
              We may suspend or terminate your access to ghali.ae at any time for violation of these terms
              or for any other reason. Upon termination, your right to use the service ceases immediately.
              You may delete your data at any time by sending &quot;clear everything&quot; to Ghali.
            </p>
          </Section>

          <Section title="13. Changes to Terms">
            <p>
              We reserve the right to modify these terms at any time. We will notify users of material
              changes through the service. Continued use after changes constitutes acceptance
              of the modified terms.
            </p>
          </Section>

          <Section title="14. Governing Law">
            <p>
              These terms are governed by the laws of the United Arab Emirates. Any disputes arising
              from these terms shall be resolved in the courts of Dubai, UAE.
            </p>
          </Section>

          <Section title="15. Contact">
            <p>
              For questions about these terms, please contact <strong className="text-white/80">SAHEM DATA TECHNOLOGY</strong> at{" "}
              <a href="mailto:support@ghali.ae" className="text-[#ED6B23] hover:underline">
                support@ghali.ae
              </a>
              {" "}or visit our office at Villa 49, Street 38B, Barsha 2, Dubai, UAE.
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-sm text-white/30">
            See also: <Link href="/privacy" className="text-[#ED6B23] hover:underline">Privacy Policy</Link>
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
