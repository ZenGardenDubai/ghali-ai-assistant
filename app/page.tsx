import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FaqAccordion } from "./components/landing/faq";
import { CtaButton } from "./components/landing/cta-button";

export const metadata: Metadata = {
  title: "Ghali — Your AI Assistant on WhatsApp",
  description:
    "Ghali is a WhatsApp-first AI assistant. Chat, generate images, analyze documents, and more. No app to install — just message and go.",
  alternates: {
    canonical: "https://ghali.ae",
  },
  openGraph: {
    title: "Ghali — Your AI Assistant on WhatsApp",
    description:
      "No app to install. No account to create. Just message Ghali on WhatsApp and get things done.",
    url: "https://ghali.ae",
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

const WHATSAPP_URL = "https://wa.me/971582896090?text=Hi%20Ghali";

const FAQS = [
  {
    question: "Do I need to install anything?",
    answer:
      "No. Ghali works entirely through WhatsApp. Just send a message.",
  },
  {
    question: "Is my data safe?",
    answer:
      'Yes. We never sell or share your data. You can delete everything at any time by sending "clear everything."',
  },
  {
    question: "What languages does Ghali speak?",
    answer:
      "Ghali automatically detects your language. Arabic and English are fully supported, with many other languages available.",
  },
  {
    question: "What AI models does Ghali use?",
    answer:
      "Ghali uses top AI models including Google Gemini, Anthropic Claude, and OpenAI \u2014 and automatically picks the best one for each task.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Yes! The Basic plan gives you 60 free messages every month. No credit card needed.",
  },
  {
    question: "How do I upgrade to Pro?",
    answer:
      'Send "upgrade" to Ghali on WhatsApp and follow the link.',
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://ghali.ae/#organization",
      name: "SAHEM DATA TECHNOLOGY",
      url: "https://ghali.ae",
      logo: {
        "@type": "ImageObject",
        url: "https://ghali.ae/ghali-logo-with-bg.png",
        width: 640,
        height: 640,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@ghali.ae",
        contactType: "customer support",
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: "Villa 49, Street 38B, Barsha 2",
        addressLocality: "Dubai",
        addressCountry: "AE",
      },
      sameAs: ["https://github.com/ZenGardenDubai/ghali-ai-assistant"],
    },
    {
      "@type": "WebSite",
      "@id": "https://ghali.ae/#website",
      url: "https://ghali.ae",
      name: "Ghali",
      description:
        "Ghali is a WhatsApp-first AI assistant. Chat, generate images, analyze documents, and more.",
      publisher: { "@id": "https://ghali.ae/#organization" },
    },
    {
      "@type": "WebPage",
      "@id": "https://ghali.ae/#webpage",
      url: "https://ghali.ae",
      name: "Ghali — Your AI Assistant on WhatsApp",
      description:
        "Ghali is a WhatsApp-first AI assistant. Chat, generate images, analyze documents, and more. No app to install — just message and go.",
      isPartOf: { "@id": "https://ghali.ae/#website" },
      about: { "@id": "https://ghali.ae/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Ghali",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "WhatsApp",
      offers: [
        {
          "@type": "Offer",
          name: "Basic",
          price: "0",
          priceCurrency: "USD",
          description: "60 messages per month, free forever",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "9.99",
          priceCurrency: "USD",
          description: "600 messages per month (10x Basic)",
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://ghali.ae" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ],
};


export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <Nav />
      <Hero />
      <Strengths />
      <HowItWorks />
      <Capabilities />
      <ExploreFeatures />
      <Pricing />
      <FaqSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ─── Nav ─────────────────────────────────────────── */

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ghali-logo-no-bg.svg"
            alt="Ghali"
            width={36}
            height={36}
          />
          <span className="text-xl font-semibold tracking-tight">Ghali</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/features" className="hidden text-sm text-white/40 transition-colors hover:text-white sm:block">
            Features
          </Link>
          <a
            href="https://github.com/ZenGardenDubai/ghali-ai-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 transition-colors hover:text-white"
            aria-label="GitHub"
          >
            <GitHubIcon className="h-5 w-5" />
          </a>
          <CtaButton
            href={WHATSAPP_URL}
            location="nav"
            className="group flex items-center gap-2 rounded-full bg-[#ED6B23] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Start Chatting
          </CtaButton>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center px-6">
      {/* Orange glow */}
      <div className="animate-pulse-glow pointer-events-none absolute top-1/3 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ED6B23]/15 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="animate-fade-up animate-float mx-auto mb-10 w-fit">
          <Image
            src="/ghali-logo-no-bg.svg"
            alt="Ghali mascot"
            width={120}
            height={120}
            priority
          />
        </div>

        <h1 className="animate-fade-up delay-100 font-[family-name:var(--font-display)] text-5xl leading-tight tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          Your AI Assistant
          <br />
          <span className="text-[#ED6B23]">on WhatsApp</span>
        </h1>

        <p className="animate-fade-up delay-200 mx-auto mt-6 max-w-xl text-lg text-white/50 sm:text-xl">
          No app to install. No account to create.
          <br className="hidden sm:block" /> Just message Ghali and get things
          done.
        </p>

        <div className="animate-fade-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <CtaButton
            href={WHATSAPP_URL}
            location="hero"
            className="group flex items-center gap-3 rounded-full bg-[#ED6B23] px-8 py-4 text-lg font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-xl hover:shadow-[#ED6B23]/25"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Start Chatting
            <span className="transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </CtaButton>
          <span className="text-sm text-white/30">Free &middot; No signup required</span>
        </div>
      </div>

    </section>
  );
}

/* ─── Key Strengths ───────────────────────────────── */

function Strengths() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>Why Ghali</SectionLabel>

        {/* Bento grid */}
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 — Just Message */}
          <Link href="/features/zero-friction" className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04] lg:col-span-2">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              <MessageIcon />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl">
              Just Message. That&apos;s It.
            </h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              No app. No account. No password. Open WhatsApp, say hi, done.
            </p>
          </Link>

          {/* Card 2 — Gets Smarter */}
          <Link href="/features/personal-memory" className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              <BrainIcon />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl">
              Gets Smarter the More You Use It
            </h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              Ghali remembers your preferences, your context, your style.
              It&apos;s not starting from scratch every time.
            </p>
          </Link>

          {/* Card 3 — Privacy */}
          <Link href="/features/privacy" className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              <ShieldIcon />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl">
              Your Stuff Stays Yours
            </h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              We don&apos;t sell your data. You can see everything Ghali knows
              about you, and delete it anytime.
            </p>
          </Link>

          {/* Card 4 — ProWrite */}
          <Link href="/features/prowrite" className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              ✍️
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl">
              Professional Writing, 8 AI Models Deep
            </h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              Say &ldquo;prowrite&rdquo; and Ghali researches, drafts, and polishes
              your content through a multi-model pipeline.
            </p>
          </Link>

          {/* Card 5 — Track Everything */}
          <Link href="/features/track-everything" className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              <ClipboardIcon />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl">
              Track Everything in One Place
            </h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              Expenses, tasks, contacts, notes &mdash; just tell Ghali and it
              organizes everything.
            </p>
          </Link>

          {/* Card 6 — Scheduled Tasks (full width, horizontal layout) */}
          <Link href="/features/scheduled-tasks" className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04] lg:col-span-3">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
                  <CalendarClockIcon />
                </div>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl">
                  AI That Works on Your Schedule
                </h3>
                <p className="mt-3 text-white/50 leading-relaxed">
                  Set tasks and Ghali runs them automatically &mdash; morning briefings, reminders, recurring reports, all delivered to WhatsApp.
                </p>
              </div>
            </div>
          </Link>

          {/* Card 7 — One Assistant (full width, with use cases) */}
          <Link href="/features/smart-ai" className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04] lg:col-span-3">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
              <SparklesIcon />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl">
              One Assistant, Everything You Need
            </h3>
            <p className="mt-3 text-white/50 leading-relaxed">
              Ask a question. Analyze a document. Write an email. Create an
              image. Ghali handles it all &mdash; and picks the best approach
              automatically.
            </p>

            {/* 4 use case cards */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: "🔍", title: "Analyze anything", desc: "Reports, data, research" },
                { icon: "📋", title: "Plan & strategize", desc: "Goals, plans, structure" },
                { icon: "✍️", title: "Write brilliantly", desc: "Emails, proposals, posts" },
                { icon: "🎨", title: "Create images", desc: "Art, logos, visuals" },
              ].map((uc) => (
                <div
                  key={uc.title}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center"
                >
                  <div className="text-2xl">{uc.icon}</div>
                  <div className="mt-2 text-sm font-medium">{uc.title}</div>
                  <div className="mt-1 text-xs text-white/40">{uc.desc}</div>
                </div>
              ))}
            </div>
          </Link>

          {/* Card 5 — Open Source */}
          <Link href="/features/open-source" className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04] lg:col-span-3">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED6B23]/10 text-2xl">
                  <CodeIcon />
                </div>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl">
                  Built in the Open
                </h3>
                <p className="mt-3 text-white/50 leading-relaxed">
                  Our code is public. You don&apos;t have to take our word for
                  it.{" "}
                  <span className="inline-flex items-center gap-1 text-[#ED6B23]">
                    View on GitHub &rarr;
                  </span>
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Message Ghali on WhatsApp",
      desc: "Open WhatsApp and send your first message. No signup, no downloads.",
    },
    {
      num: "02",
      title: "Ask anything",
      desc: "Questions, tasks, images, documents \u2014 whatever you need help with.",
    },
    {
      num: "03",
      title: "Get the best answer, instantly",
      desc: "Ghali picks the smartest AI for the job and responds in seconds.",
    },
  ];

  return (
    <section className="relative px-6 py-24 md:py-32">
      {/* Divider gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <SectionLabel>How It Works</SectionLabel>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.num} className="relative">
              <span className="font-[family-name:var(--font-display)] text-6xl text-[#ED6B23]/20">
                {step.num}
              </span>
              <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-white/50 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Capabilities ────────────────────────────────── */

function Capabilities() {
  const items = [
    {
      icon: "💬",
      title: "Answer questions",
      desc: "From quick facts to deep research",
      href: "/features/smart-ai",
    },
    {
      icon: "📄",
      title: "Analyze documents",
      desc: "Send a PDF, get instant insights",
      href: "/features/documents",
    },
    {
      icon: "🖼️",
      title: "Generate images",
      desc: "Describe what you want, get it in seconds",
      href: "/features/image-generation",
    },
    {
      icon: "🎤",
      title: "Understand voice notes",
      desc: "Just talk, Ghali listens",
      href: "/features/understand-anything",
    },
    {
      icon: "🧠",
      title: "Remember everything",
      desc: "Your preferences, your context, your history",
      href: "/features/personal-memory",
    },
    {
      icon: "📊",
      title: "Track expenses & tasks",
      desc: "Expenses, tasks, contacts, notes — all organized",
      href: "/features/track-everything",
    },
    {
      icon: "⏰",
      title: "Scheduled tasks",
      desc: "Reminders, briefings, and recurring AI tasks",
      href: "/features/scheduled-tasks",
    },
    {
      icon: "✍️",
      title: "Professional writing",
      desc: "Multi-AI pipeline for polished content",
      href: "/features/prowrite",
    },
    {
      icon: "🌍",
      title: "Speak your language",
      desc: "Arabic, English, and more",
      href: "/features",
    },
  ];

  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <SectionLabel>What Ghali Can Do</SectionLabel>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-[#ED6B23]/30 hover:bg-white/[0.04]"
            >
              <span className="shrink-0 text-2xl">{item.icon}</span>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-white/50">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Explore Features Bridge ─────────────────────── */

function ExploreFeatures() {
  return (
    <section className="relative px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/features"
          className="group relative block overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-r from-[#ED6B23]/[0.06] to-transparent p-8 transition-all hover:border-[#ED6B23]/30 sm:p-10"
        >
          {/* Subtle glow on hover */}
          <div className="pointer-events-none absolute -right-20 top-1/2 h-[200px] w-[200px] -translate-y-1/2 rounded-full bg-[#ED6B23]/10 blur-[80px] transition-opacity duration-500 opacity-0 group-hover:opacity-100" />

          <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
                There&apos;s more
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
                Explore all features
              </h2>
              <p className="mt-2 text-white/40">
                Deep thinking, document analysis, scheduled tasks, open source, and more.
              </p>
            </div>
            <span className="shrink-0 flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-medium transition-all group-hover:border-[#ED6B23]/40 group-hover:bg-[#ED6B23]/10 group-hover:text-[#ED6B23]">
              See all features
              <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────── */

function Pricing() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <SectionLabel>Pricing</SectionLabel>

        <div className="mt-12 grid gap-6 md:grid-cols-2 md:max-w-3xl md:mx-auto">
          {/* Basic */}
          <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">
              Basic
            </h3>
            <div className="mt-4 font-[family-name:var(--font-display)] text-5xl">
              Free
            </div>
            <ul className="mt-8 space-y-3 text-white/60">
              <PricingItem>60 messages per month</PricingItem>
              <PricingItem>Image generation</PricingItem>
              <PricingItem>Audio &amp; video understanding</PricingItem>
              <PricingItem>Document analysis &amp; knowledge base</PricingItem>
              <PricingItem>Track expenses, tasks &amp; more</PricingItem>
              <PricingItem>Deep thinking for tough questions</PricingItem>
              <PricingItem>Scheduled AI tasks &amp; reminders</PricingItem>
              <PricingItem>Proactive check-ins (heartbeat)</PricingItem>
              <PricingItem>Learns your style &amp; preferences</PricingItem>
              <PricingItem>No credit card required</PricingItem>
            </ul>
            <CtaButton
              href={WHATSAPP_URL}
              location="pricing_basic"
              className="mt-8 block rounded-full border border-white/10 py-3 text-center font-medium transition-all hover:border-white/20 hover:bg-white/5"
            >
              Get Started
            </CtaButton>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border border-[#ED6B23]/40 bg-[#ED6B23]/[0.04] p-8">
            <div className="absolute -top-3 right-6 rounded-full bg-[#ED6B23] px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Popular
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
              Pro
            </h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-5xl">
                $9.99
              </span>
              <span className="text-white/40">/month</span>
            </div>
            <p className="mt-1 text-sm text-white/40">
              or $99.48/year (save 17%)
            </p>
            <ul className="mt-8 space-y-3 text-white/60">
              <PricingItem highlight>600 messages per month (10x Basic)</PricingItem>
              <PricingItem highlight>Same features, more room to use them</PricingItem>
              <PricingItem highlight>Everything in Basic</PricingItem>
            </ul>
            <CtaButton
              href={WHATSAPP_URL}
              location="pricing_pro"
              className="mt-8 md:mt-auto block rounded-full bg-[#ED6B23] py-3 text-center font-medium transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
            >
              Get Started
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingItem({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <svg
        className={`h-4 w-4 shrink-0 ${highlight ? "text-[#ED6B23]" : "text-white/30"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {children}
    </li>
  );
}

/* ─── FAQ ─────────────────────────────────────────── */

function FaqSection() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-3xl">
        <SectionLabel>FAQ</SectionLabel>

        <div className="mt-12">
          <FaqAccordion items={FAQS} />
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ───────────────────────────────────── */

function FinalCta() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Orange glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
          Ready to try <span className="text-[#ED6B23]">Ghali</span>?
        </h2>
        <p className="mt-4 text-lg text-white/50">
          Send a message. It&apos;s that simple.
        </p>
        <CtaButton
          href={WHATSAPP_URL}
          location="final_cta"
          className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[#ED6B23] px-8 py-4 text-lg font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-xl hover:shadow-[#ED6B23]/25"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Start Chatting
          <span className="transition-transform group-hover:translate-x-1">
            &rarr;
          </span>
        </CtaButton>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/5 px-6">
      {/* Top bar */}
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 py-6 text-sm text-white/40 sm:flex-row">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/ghali-logo-no-bg.svg"
            alt="Ghali"
            width={24}
            height={24}
          />
          <span className="font-semibold text-white">ghali.ae</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/features" className="transition-colors hover:text-white">Features</Link>
          <Link href="/feedback" className="transition-colors hover:text-white">Feedback</Link>
          <Link href="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="transition-colors hover:text-white">Terms of Service</Link>
        </nav>
      </div>
      {/* Bottom */}
      <div className="mx-auto max-w-6xl py-8 text-center text-sm text-white/30 space-y-2">
        <p>&copy; 2026 SAHEM DATA TECHNOLOGY. All rights reserved.</p>
        <p>ghali.ae is a product of SAHEM DATA TECHNOLOGY, Dubai, UAE</p>
        <p>Made with ❤️ in the UAE 🇦🇪</p>
      </div>
    </footer>
  );
}

/* ─── Shared Components ───────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px w-8 bg-[#ED6B23]" />
      <span className="text-sm font-semibold uppercase tracking-wider text-[#ED6B23]">
        {children}
      </span>
    </div>
  );
}

/* ─── Icons ───────────────────────────────────────── */

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-11.25 5.25l-1.5 1.5V5.25A2.25 2.25 0 016.375 3h11.25a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25H8.25l-3.375 3z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function CalendarClockIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v4.5m-9-4.5h.008v.008H12V7.5zm0 3h.008v.008H12v-.008zm0 3h.008v.008H12v-.008zm-3-6h.008v.008H9V7.5zm0 3h.008v.008H9v-.008zm0 3h.008v.008H9v-.008zm9.75 3a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zm-2.25-.75l-.75.75" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="h-6 w-6 text-[#ED6B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}
