import type { TranslationDict } from "./types";

const WHATSAPP_URL = "https://wa.me/971582896090?text=Hi%20Ghali";
const WHATSAPP_URL_AR = "https://wa.me/971582896090?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%20%D8%BA%D8%A7%D9%84%D9%8A";

export const en: TranslationDict = {
  locale: "en",
  dir: "ltr",
  whatsappUrl: WHATSAPP_URL,

  nav: {
    features: "Features",
    startChatting: "Start Chatting",
  },

  hero: {
    titleLine1: "The UAE's Favourite AI Assistant",
    titleLine2: "on WhatsApp",
    subtitle:
      "No app to install. No account to create. Just message Ghali and get things done.",
    cta: "Start Chatting",
    trust: "Free \u00B7 No signup required",
  },

  strengths: {
    label: "Why Ghali",
    cards: [
      {
        icon: "message",
        title: "Just Message. That\u2019s It.",
        description:
          "No app. No account. No password. Open WhatsApp, say hi, done.",
        href: "/features/zero-friction",
        colSpan: "2",
      },
      {
        icon: "brain",
        title: "Gets Smarter the More You Use It",
        description:
          "Ghali remembers your preferences, your context, your style. It\u2019s not starting from scratch every time.",
        href: "/features/personal-memory",
      },
      {
        icon: "shield",
        title: "Your Stuff Stays Yours",
        description:
          "We don\u2019t sell your data. You can see everything Ghali knows about you, and delete it anytime.",
        href: "/features/privacy",
      },
      {
        icon: "emoji",
        title: "Professional Writing, 8 AI Models Deep",
        description:
          'Say \u201Cprowrite\u201D and Ghali researches, drafts, and polishes your content through a multi-model pipeline.',
        href: "/features/prowrite",
      },
      {
        icon: "clipboard",
        title: "Track Everything in One Place",
        description:
          "Expenses, tasks, contacts, notes \u2014 just tell Ghali and it organizes everything.",
        href: "/features/track-everything",
      },
      {
        icon: "calendar",
        title: "AI That Works on Your Schedule",
        description:
          "Set tasks and Ghali runs them automatically \u2014 morning briefings, reminders, recurring reports, all delivered to WhatsApp.",
        href: "/features/scheduled-tasks",
        colSpan: "3",
        horizontal: true,
      },
      {
        icon: "sparkles",
        title: "One Assistant, Everything You Need",
        description:
          "Ask a question. Analyze a document. Write an email. Create an image. Ghali handles it all \u2014 and picks the best approach automatically.",
        href: "/features/smart-ai",
        colSpan: "3",
        useCases: [
          { icon: "\uD83D\uDD0D", title: "Analyze anything", desc: "Reports, data, research" },
          { icon: "\uD83D\uDCCB", title: "Plan & strategize", desc: "Goals, plans, structure" },
          { icon: "\u270D\uFE0F", title: "Write brilliantly", desc: "Emails, proposals, posts" },
          { icon: "\uD83C\uDFA8", title: "Create images", desc: "Art, logos, visuals" },
        ],
      },
      {
        icon: "code",
        title: "Built in the Open",
        description:
          "Our code is public. You don\u2019t have to take our word for it.",
        href: "/features/open-source",
        colSpan: "3",
        horizontal: true,
        linkText: "View on GitHub \u2192",
      },
    ],
  },

  howItWorks: {
    label: "How It Works",
    steps: [
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
    ],
  },

  capabilities: {
    label: "What Ghali Can Do",
    items: [
      { icon: "\uD83D\uDCAC", title: "Answer questions", desc: "From quick facts to deep research", href: "/features/smart-ai" },
      { icon: "\uD83D\uDCC4", title: "Analyze documents", desc: "Send a PDF, get instant insights", href: "/features/documents" },
      { icon: "\uD83D\uDDBC\uFE0F", title: "Generate images", desc: "Describe what you want, get it in seconds", href: "/features/image-generation" },
      { icon: "\uD83C\uDFA4", title: "Understand voice notes", desc: "Just talk, Ghali listens", href: "/features/understand-anything" },
      { icon: "\uD83E\uDDE0", title: "Remember everything", desc: "Your preferences, your context, your history", href: "/features/personal-memory" },
      { icon: "\uD83D\uDCCA", title: "Track expenses & tasks", desc: "Expenses, tasks, contacts, notes \u2014 all organized", href: "/features/track-everything" },
      { icon: "\u23F0", title: "Scheduled tasks", desc: "Reminders, briefings, and recurring AI tasks", href: "/features/scheduled-tasks" },
      { icon: "\u270D\uFE0F", title: "Professional writing", desc: "Multi-AI pipeline for polished content", href: "/features/prowrite" },
      { icon: "\uD83C\uDF0D", title: "Speak your language", desc: "Arabic, English, and more", href: "/features" },
    ],
  },

  exploreFeatures: {
    tagline: "There\u2019s more",
    title: "Explore all features",
    description:
      "Deep thinking, document analysis, scheduled tasks, open source, and more.",
    cta: "See all features",
    href: "/features",
  },

  pricing: {
    label: "Pricing",
    basic: {
      name: "Basic",
      price: "Free",
      features: [
        { text: "60 credits per month" },
        { text: "Image generation" },
        { text: "Audio & video understanding" },
        { text: "Document analysis & knowledge base" },
        { text: "Track expenses, tasks & more" },
        { text: "Deep thinking for tough questions" },
        { text: "Scheduled AI tasks & reminders" },
        { text: "Proactive check-ins (heartbeat)" },
        { text: "Learns your style & preferences" },
        { text: "No credit card required" },
      ],
      cta: "Get Started",
    },
    pro: {
      name: "Pro",
      badge: "Popular",
      pricePrimary: "$9.99",
      pricePeriod: "/month",
      priceSecondary: "or $99.48/year (save 17%)",
      priceAlt: "AED 36.99/mo or AED 365/year",
      features: [
        { text: "600 credits per month (10x Basic)", highlight: true },
        { text: "Same features, more room to use them", highlight: true },
        { text: "Everything in Basic", highlight: true },
      ],
      cta: "Get Started",
    },
  },

  faq: {
    label: "FAQ",
    items: [
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
    ],
  },

  finalCta: {
    title: "Ready to try",
    titleHighlight: "Ghali",
    subtitle: "Send a message. It\u2019s that simple.",
    cta: "Start Chatting",
  },

  footer: {
    features: "Features",
    feedback: "Feedback",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    copyright: "\u00A9 2026 SAHEM DATA TECHNOLOGY. All rights reserved.",
    tagline: "ghali.ae is a product of SAHEM DATA TECHNOLOGY, Dubai, UAE",
    madeWith: "Made with \u2764\uFE0F in the UAE \uD83C\uDDE6\uD83C\uDDEA",
    privacyHref: "/privacy",
    termsHref: "/terms",
    featuresHref: "/features",
    feedbackHref: "/feedback",
  },

  start: {
    headline: "Your AI Assistant on WhatsApp",
    phone: "+971 58 289 6090",
    cta: "Chat with Ghali on WhatsApp",
    trust: "Free \u00B7 No signup \u00B7 60 credits/month",
    switchLocale: "\u0639\u0631\u0628\u064A",
    switchLocaleHref: "/ar/start",
  },

  stickyWhatsApp: {
    ariaLabel: "Chat with Ghali on WhatsApp",
  },
};

export const ar: TranslationDict = {
  locale: "ar",
  dir: "rtl",
  whatsappUrl: WHATSAPP_URL_AR,

  nav: {
    features: "\u0627\u0644\u0645\u0632\u0627\u064A\u0627",
    startChatting: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629",
  },

  hero: {
    titleLine1: "\u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0630\u0643\u064A \u0627\u0644\u0645\u0641\u0636\u0651\u0644 \u0641\u064A \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A",
    titleLine2: "\u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628",
    subtitle:
      "\u0628\u062F\u0648\u0646 \u062A\u0637\u0628\u064A\u0642. \u0628\u062F\u0648\u0646 \u062D\u0633\u0627\u0628. \u0628\u0633 \u0631\u0627\u0633\u0644 \u063A\u0627\u0644\u064A \u0648\u062E\u0644\u0651\u0635 \u0634\u063A\u0644\u0643.",
    cta: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629",
    trust: "\u0645\u062C\u0627\u0646\u064A \u00B7 \u0628\u062F\u0648\u0646 \u062A\u0633\u062C\u064A\u0644",
  },

  strengths: {
    label: "\u0644\u064A\u0634 \u063A\u0627\u0644\u064A\u061F",
    cards: [
      {
        icon: "message",
        title: "\u0628\u0633 \u0631\u0627\u0633\u0644. \u0648\u062E\u0644\u0627\u0635.",
        description:
          "\u0628\u062F\u0648\u0646 \u062A\u0637\u0628\u064A\u0642. \u0628\u062F\u0648\u0646 \u062D\u0633\u0627\u0628. \u0628\u062F\u0648\u0646 \u0643\u0644\u0645\u0629 \u0633\u0631. \u0627\u0641\u062A\u062D \u0648\u0627\u062A\u0633\u0627\u0628\u060C \u0642\u0648\u0644 \u0647\u0644\u0627\u060C \u0648\u062E\u0644\u0627\u0635.",
        href: "/ar/features/zero-friction",
        colSpan: "2",
      },
      {
        icon: "brain",
        title: "\u064A\u0635\u064A\u0631 \u0623\u0630\u0643\u0649 \u0643\u0644 \u0645\u0627 \u0627\u0633\u062A\u062E\u062F\u0645\u062A\u0647",
        description:
          "\u063A\u0627\u0644\u064A \u064A\u062A\u0630\u0643\u0631 \u062A\u0641\u0636\u064A\u0644\u0627\u062A\u0643 \u0648\u0633\u064A\u0627\u0642\u0643 \u0648\u0623\u0633\u0644\u0648\u0628\u0643. \u0645\u0627 \u064A\u0628\u062F\u0623 \u0645\u0646 \u0627\u0644\u0635\u0641\u0631 \u0643\u0644 \u0645\u0631\u0629.",
        href: "/ar/features/personal-memory",
      },
      {
        icon: "shield",
        title: "\u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0645\u0644\u0643\u0643",
        description:
          "\u0645\u0627 \u0646\u0628\u064A\u0639 \u0628\u064A\u0627\u0646\u0627\u062A\u0643. \u062A\u0642\u062F\u0631 \u062A\u0634\u0648\u0641 \u0643\u0644 \u0634\u064A \u063A\u0627\u0644\u064A \u064A\u0639\u0631\u0641\u0647 \u0639\u0646\u0643\u060C \u0648\u062A\u0645\u0633\u062D\u0647 \u0628\u0623\u064A \u0648\u0642\u062A.",
        href: "/ar/features/privacy",
      },
      {
        icon: "emoji",
        title: "\u0643\u062A\u0627\u0628\u0629 \u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629\u060C 8 \u0646\u0645\u0627\u0630\u062C \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A",
        description:
          '\u0642\u0648\u0644 "prowrite" \u0648\u063A\u0627\u0644\u064A \u064A\u0628\u062D\u062B \u0648\u064A\u0643\u062A\u0628 \u0648\u064A\u0635\u0642\u0644 \u0645\u062D\u062A\u0648\u0627\u0643 \u0639\u0628\u0631 \u062E\u0637 \u0625\u0646\u062A\u0627\u062C \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0646\u0645\u0627\u0630\u062C.',
        href: "/ar/features/prowrite",
      },
      {
        icon: "clipboard",
        title: "\u062A\u0627\u0628\u0639 \u0643\u0644 \u0634\u064A \u0641\u064A \u0645\u0643\u0627\u0646 \u0648\u0627\u062D\u062F",
        description:
          "\u0645\u0635\u0627\u0631\u064A\u0641\u060C \u0645\u0647\u0627\u0645\u060C \u062C\u0647\u0627\u062A \u0627\u062A\u0635\u0627\u0644\u060C \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u2014 \u0628\u0633 \u0642\u0648\u0644 \u0644\u063A\u0627\u0644\u064A \u0648\u064A\u0646\u0638\u0645 \u0643\u0644 \u0634\u064A.",
        href: "/ar/features/track-everything",
      },
      {
        icon: "calendar",
        title: "\u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u064A\u0634\u062A\u063A\u0644 \u062D\u0633\u0628 \u062C\u062F\u0648\u0644\u0643",
        description:
          "\u062D\u062F\u062F \u0645\u0647\u0627\u0645 \u0648\u063A\u0627\u0644\u064A \u064A\u0646\u0641\u0630\u0647\u0627 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u2014 \u0645\u0644\u062E\u0635\u0627\u062A \u0635\u0628\u0627\u062D\u064A\u0629\u060C \u062A\u0630\u0643\u064A\u0631\u0627\u062A\u060C \u062A\u0642\u0627\u0631\u064A\u0631 \u062F\u0648\u0631\u064A\u0629\u060C \u0643\u0644\u0647\u0627 \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628.",
        href: "/ar/features/scheduled-tasks",
        colSpan: "3",
        horizontal: true,
      },
      {
        icon: "sparkles",
        title: "\u0645\u0633\u0627\u0639\u062F \u0648\u0627\u062D\u062F\u060C \u0643\u0644 \u0634\u064A \u062A\u062D\u062A\u0627\u062C\u0647",
        description:
          "\u0627\u0633\u0623\u0644 \u0633\u0624\u0627\u0644. \u062D\u0644\u0651\u0644 \u0645\u0633\u062A\u0646\u062F. \u0627\u0643\u062A\u0628 \u0625\u064A\u0645\u064A\u0644. \u0623\u0646\u0634\u0626 \u0635\u0648\u0631\u0629. \u063A\u0627\u0644\u064A \u064A\u062A\u0643\u0641\u0644 \u0628\u0627\u0644\u0643\u0644 \u2014 \u0648\u064A\u062E\u062A\u0627\u0631 \u0623\u0641\u0636\u0644 \u0637\u0631\u064A\u0642\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.",
        href: "/ar/features/smart-ai",
        colSpan: "3",
        useCases: [
          { icon: "\uD83D\uDD0D", title: "\u062D\u0644\u0651\u0644 \u0623\u064A \u0634\u064A", desc: "\u062A\u0642\u0627\u0631\u064A\u0631\u060C \u0628\u064A\u0627\u0646\u0627\u062A\u060C \u0623\u0628\u062D\u0627\u062B" },
          { icon: "\uD83D\uDCCB", title: "\u062E\u0637\u0651\u0637 \u0648\u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C", desc: "\u0623\u0647\u062F\u0627\u0641\u060C \u062E\u0637\u0637\u060C \u0647\u064A\u0643\u0644\u0629" },
          { icon: "\u270D\uFE0F", title: "\u0627\u0643\u062A\u0628 \u0628\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629", desc: "\u0625\u064A\u0645\u064A\u0644\u0627\u062A\u060C \u0639\u0631\u0648\u0636\u060C \u0645\u0646\u0634\u0648\u0631\u0627\u062A" },
          { icon: "\uD83C\uDFA8", title: "\u0623\u0646\u0634\u0626 \u0635\u0648\u0631", desc: "\u0641\u0646\u060C \u0634\u0639\u0627\u0631\u0627\u062A\u060C \u062A\u0635\u0627\u0645\u064A\u0645" },
        ],
      },
      {
        icon: "code",
        title: "\u0645\u0628\u0646\u064A \u0628\u0634\u0641\u0627\u0641\u064A\u0629",
        description:
          "\u0643\u0648\u062F\u0646\u0627 \u0639\u0644\u0646\u064A. \u0645\u0627 \u062A\u062D\u062A\u0627\u062C \u062A\u0627\u062E\u0630 \u0643\u0644\u0627\u0645\u0646\u0627 \u0639\u0644\u0649 \u062B\u0642\u0629.",
        href: "/ar/features/open-source",
        colSpan: "3",
        horizontal: true,
        linkText: "\u0634\u0648\u0641 \u0639\u0644\u0649 GitHub \u2190",
      },
    ],
  },

  howItWorks: {
    label: "\u0643\u064A\u0641 \u064A\u0639\u0645\u0644",
    steps: [
      {
        num: "01",
        title: "\u0631\u0627\u0633\u0644 \u063A\u0627\u0644\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628",
        desc: "\u0627\u0641\u062A\u062D \u0648\u0627\u062A\u0633\u0627\u0628 \u0648\u0627\u0631\u0633\u0644 \u0623\u0648\u0644 \u0631\u0633\u0627\u0644\u0629. \u0628\u062F\u0648\u0646 \u062A\u0633\u062C\u064A\u0644\u060C \u0628\u062F\u0648\u0646 \u062A\u062D\u0645\u064A\u0644.",
      },
      {
        num: "02",
        title: "\u0627\u0633\u0623\u0644 \u0623\u064A \u0634\u064A",
        desc: "\u0623\u0633\u0626\u0644\u0629\u060C \u0645\u0647\u0627\u0645\u060C \u0635\u0648\u0631\u060C \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u2014 \u0623\u064A \u0634\u064A \u062A\u062D\u062A\u0627\u062C \u0645\u0633\u0627\u0639\u062F\u0629 \u0641\u064A\u0647.",
      },
      {
        num: "03",
        title: "\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u0623\u0641\u0636\u0644 \u0625\u062C\u0627\u0628\u0629\u060C \u0641\u0648\u0631\u0627\u064B",
        desc: "\u063A\u0627\u0644\u064A \u064A\u062E\u062A\u0627\u0631 \u0623\u0630\u0643\u0649 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u0644\u0645\u0647\u0645\u0629 \u0648\u064A\u0631\u062F \u062E\u0644\u0627\u0644 \u062B\u0648\u0627\u0646\u064A.",
      },
    ],
  },

  capabilities: {
    label: "\u0634\u0648 \u064A\u0642\u062F\u0631 \u063A\u0627\u0644\u064A \u064A\u0633\u0648\u064A",
    items: [
      { icon: "\uD83D\uDCAC", title: "\u064A\u062C\u0627\u0648\u0628 \u0623\u0633\u0626\u0644\u0629", desc: "\u0645\u0646 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0633\u0631\u064A\u0639\u0629 \u0644\u0628\u062D\u062B \u0639\u0645\u064A\u0642", href: "/ar/features/smart-ai" },
      { icon: "\uD83D\uDCC4", title: "\u064A\u062D\u0644\u0651\u0644 \u0645\u0633\u062A\u0646\u062F\u0627\u062A", desc: "\u0627\u0631\u0633\u0644 PDF\u060C \u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u062A\u062D\u0644\u064A\u0644 \u0641\u0648\u0631\u064A", href: "/ar/features/documents" },
      { icon: "\uD83D\uDDBC\uFE0F", title: "\u064A\u0646\u0634\u0626 \u0635\u0648\u0631", desc: "\u0648\u0635\u0651\u0641 \u0627\u0644\u0644\u064A \u062A\u0628\u064A\u0647\u060C \u0648\u0627\u062D\u0635\u0644 \u0639\u0644\u064A\u0647 \u062E\u0644\u0627\u0644 \u062B\u0648\u0627\u0646\u064A", href: "/ar/features/image-generation" },
      { icon: "\uD83C\uDFA4", title: "\u064A\u0641\u0647\u0645 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0635\u0648\u062A\u064A\u0629", desc: "\u0628\u0633 \u062A\u0643\u0644\u0645\u060C \u063A\u0627\u0644\u064A \u064A\u0633\u0645\u0639", href: "/ar/features/understand-anything" },
      { icon: "\uD83E\uDDE0", title: "\u064A\u062A\u0630\u0643\u0631 \u0643\u0644 \u0634\u064A", desc: "\u062A\u0641\u0636\u064A\u0644\u0627\u062A\u0643\u060C \u0633\u064A\u0627\u0642\u0643\u060C \u062A\u0627\u0631\u064A\u062E\u0643", href: "/ar/features/personal-memory" },
      { icon: "\uD83D\uDCCA", title: "\u064A\u062A\u0627\u0628\u0639 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0648\u0627\u0644\u0645\u0647\u0627\u0645", desc: "\u0645\u0635\u0627\u0631\u064A\u0641\u060C \u0645\u0647\u0627\u0645\u060C \u062C\u0647\u0627\u062A \u0627\u062A\u0635\u0627\u0644\u060C \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u2014 \u0643\u0644\u0647\u0627 \u0645\u0646\u0638\u0645\u0629", href: "/ar/features/track-everything" },
      { icon: "\u23F0", title: "\u0645\u0647\u0627\u0645 \u0645\u062C\u062F\u0648\u0644\u0629", desc: "\u062A\u0630\u0643\u064A\u0631\u0627\u062A\u060C \u0645\u0644\u062E\u0635\u0627\u062A\u060C \u0648\u0645\u0647\u0627\u0645 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u062F\u0648\u0631\u064A\u0629", href: "/ar/features/scheduled-tasks" },
      { icon: "\u270D\uFE0F", title: "\u0643\u062A\u0627\u0628\u0629 \u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629", desc: "\u062E\u0637 \u0625\u0646\u062A\u0627\u062C \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0646\u0645\u0627\u0630\u062C \u0644\u0645\u062D\u062A\u0648\u0649 \u0645\u0635\u0642\u0648\u0644", href: "/ar/features/prowrite" },
      { icon: "\uD83C\uDF0D", title: "\u064A\u062A\u0643\u0644\u0645 \u0644\u063A\u062A\u0643", desc: "\u0639\u0631\u0628\u064A\u060C \u0625\u0646\u062C\u0644\u064A\u0632\u064A\u060C \u0648\u063A\u064A\u0631\u0647\u0627", href: "/ar/features" },
    ],
  },

  exploreFeatures: {
    tagline: "\u0641\u064A\u0647 \u0627\u0644\u0645\u0632\u064A\u062F",
    title: "\u0627\u0633\u062A\u0643\u0634\u0641 \u0643\u0644 \u0627\u0644\u0645\u0632\u0627\u064A\u0627",
    description:
      "\u062A\u0641\u0643\u064A\u0631 \u0639\u0645\u064A\u0642\u060C \u062A\u062D\u0644\u064A\u0644 \u0645\u0633\u062A\u0646\u062F\u0627\u062A\u060C \u0645\u0647\u0627\u0645 \u0645\u062C\u062F\u0648\u0644\u0629\u060C \u0645\u0641\u062A\u0648\u062D \u0627\u0644\u0645\u0635\u062F\u0631\u060C \u0648\u0627\u0644\u0645\u0632\u064A\u062F.",
    cta: "\u0634\u0648\u0641 \u0643\u0644 \u0627\u0644\u0645\u0632\u0627\u064A\u0627",
    href: "/ar/features",
  },

  pricing: {
    label: "\u0627\u0644\u0623\u0633\u0639\u0627\u0631",
    basic: {
      name: "Basic",
      price: "\u0645\u062C\u0627\u0646\u064A",
      features: [
        { text: "60 \u0631\u0635\u064A\u062F \u0634\u0647\u0631\u064A\u0627\u064B" },
        { text: "\u0625\u0646\u0634\u0627\u0621 \u0635\u0648\u0631" },
        { text: "\u0641\u0647\u0645 \u0627\u0644\u0635\u0648\u062A \u0648\u0627\u0644\u0641\u064A\u062F\u064A\u0648" },
        { text: "\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0648\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629" },
        { text: "\u062A\u062A\u0628\u0639 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0648\u0627\u0644\u0645\u0647\u0627\u0645 \u0648\u063A\u064A\u0631\u0647\u0627" },
        { text: "\u062A\u0641\u0643\u064A\u0631 \u0639\u0645\u064A\u0642 \u0644\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0635\u0639\u0628\u0629" },
        { text: "\u0645\u0647\u0627\u0645 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u062C\u062F\u0648\u0644\u0629 \u0648\u062A\u0630\u0643\u064A\u0631\u0627\u062A" },
        { text: "\u0645\u062A\u0627\u0628\u0639\u0627\u062A \u0627\u0633\u062A\u0628\u0627\u0642\u064A\u0629 (heartbeat)" },
        { text: "\u064A\u062A\u0639\u0644\u0645 \u0623\u0633\u0644\u0648\u0628\u0643 \u0648\u062A\u0641\u0636\u064A\u0644\u0627\u062A\u0643" },
        { text: "\u0628\u062F\u0648\u0646 \u0628\u0637\u0627\u0642\u0629 \u0627\u0626\u062A\u0645\u0627\u0646" },
      ],
      cta: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0622\u0646",
    },
    pro: {
      name: "Pro",
      badge: "\u0627\u0644\u0623\u0643\u062B\u0631 \u0634\u0639\u0628\u064A\u0629",
      pricePrimary: "AED 36.99",
      pricePeriod: "/\u0634\u0647\u0631",
      priceSecondary: "\u0623\u0648 AED 365/\u0633\u0646\u0629 (\u0648\u0641\u0651\u0631 17%)",
      priceAlt: "$9.99/mo or $99.48/year",
      features: [
        { text: "600 \u0631\u0635\u064A\u062F \u0634\u0647\u0631\u064A\u0627\u064B (10x Basic)", highlight: true },
        { text: "\u0646\u0641\u0633 \u0627\u0644\u0645\u0632\u0627\u064A\u0627\u060C \u0645\u0633\u0627\u062D\u0629 \u0623\u0643\u0628\u0631 \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0647\u0627", highlight: true },
        { text: "\u0643\u0644 \u0634\u064A \u0641\u064A Basic", highlight: true },
      ],
      cta: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0622\u0646",
    },
  },

  faq: {
    label: "\u0623\u0633\u0626\u0644\u0629 \u0634\u0627\u0626\u0639\u0629",
    items: [
      {
        question: "\u0647\u0644 \u0623\u062D\u062A\u0627\u062C \u062A\u062D\u0645\u064A\u0644 \u0634\u064A\u061F",
        answer:
          "\u0644\u0627. \u063A\u0627\u0644\u064A \u064A\u0639\u0645\u0644 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628. \u0628\u0633 \u0627\u0631\u0633\u0644 \u0631\u0633\u0627\u0644\u0629.",
      },
      {
        question: "\u0647\u0644 \u0628\u064A\u0627\u0646\u0627\u062A\u064A \u0622\u0645\u0646\u0629\u061F",
        answer:
          '\u0646\u0639\u0645. \u0645\u0627 \u0646\u0628\u064A\u0639 \u0623\u0648 \u0646\u0634\u0627\u0631\u0643 \u0628\u064A\u0627\u0646\u0627\u062A\u0643. \u062A\u0642\u062F\u0631 \u062A\u0645\u0633\u062D \u0643\u0644 \u0634\u064A \u0628\u0623\u064A \u0648\u0642\u062A \u0628\u0625\u0631\u0633\u0627\u0644 "\u0627\u0645\u0633\u062D \u0643\u0644 \u0634\u064A".',
      },
      {
        question: "\u0634\u0648 \u0627\u0644\u0644\u063A\u0627\u062A \u0627\u0644\u0644\u064A \u064A\u062A\u0643\u0644\u0645\u0647\u0627 \u063A\u0627\u0644\u064A\u061F",
        answer:
          "\u063A\u0627\u0644\u064A \u064A\u0643\u062A\u0634\u0641 \u0644\u063A\u062A\u0643 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B. \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0645\u062F\u0639\u0648\u0645\u062A\u0627\u0646 \u0628\u0627\u0644\u0643\u0627\u0645\u0644\u060C \u0645\u0639 \u0644\u063A\u0627\u062A \u0623\u062E\u0631\u0649 \u0643\u062B\u064A\u0631\u0629.",
      },
      {
        question: "\u0634\u0648 \u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0644\u064A \u064A\u0633\u062A\u062E\u062F\u0645\u0647\u0627 \u063A\u0627\u0644\u064A\u061F",
        answer:
          "\u063A\u0627\u0644\u064A \u064A\u0633\u062A\u062E\u062F\u0645 \u0623\u0641\u0636\u0644 \u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0645\u0646 Google Gemini \u0648Anthropic Claude \u0648OpenAI \u2014 \u0648\u064A\u062E\u062A\u0627\u0631 \u0627\u0644\u0623\u0641\u0636\u0644 \u0644\u0643\u0644 \u0645\u0647\u0645\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.",
      },
      {
        question: "\u0623\u0642\u062F\u0631 \u0623\u062C\u0631\u0628\u0647 \u0645\u062C\u0627\u0646\u0627\u064B\u061F",
        answer:
          "\u0637\u0628\u0639\u0627\u064B! \u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629 \u062A\u0639\u0637\u064A\u0643 60 \u0631\u0633\u0627\u0644\u0629 \u0643\u0644 \u0634\u0647\u0631. \u0628\u062F\u0648\u0646 \u0628\u0637\u0627\u0642\u0629 \u0627\u0626\u062A\u0645\u0627\u0646.",
      },
      {
        question: "\u0643\u064A\u0641 \u0623\u062A\u0631\u0642\u0649 \u0644\u0640 Pro\u061F",
        answer:
          '\u0627\u0631\u0633\u0644 "upgrade" \u0644\u063A\u0627\u0644\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628 \u0648\u0627\u062A\u0628\u0639 \u0627\u0644\u0631\u0627\u0628\u0637.',
      },
    ],
  },

  finalCta: {
    title: "\u062C\u0627\u0647\u0632 \u062A\u062C\u0631\u0628",
    titleHighlight: "\u063A\u0627\u0644\u064A",
    subtitle: "\u0627\u0631\u0633\u0644 \u0631\u0633\u0627\u0644\u0629. \u0628\u0633 \u0643\u0630\u0627.",
    cta: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629",
  },

  footer: {
    features: "\u0627\u0644\u0645\u0632\u0627\u064A\u0627",
    feedback: "\u0645\u0644\u0627\u062D\u0638\u0627\u062A",
    privacy: "\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629",
    terms: "\u0634\u0631\u0648\u0637 \u0627\u0644\u062E\u062F\u0645\u0629",
    copyright: "\u00A9 2026 SAHEM DATA TECHNOLOGY. \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629.",
    tagline: "ghali.ae \u0645\u0646\u062A\u062C \u0645\u0646 SAHEM DATA TECHNOLOGY\u060C \u062F\u0628\u064A\u060C \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A",
    madeWith: "\u0635\u0646\u0639 \u0628\u062D\u0628 \u2764\uFE0F \u0641\u064A \u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A \uD83C\uDDE6\uD83C\uDDEA",
    privacyHref: "/privacy",
    termsHref: "/terms",
    featuresHref: "/ar/features",
    feedbackHref: "/feedback",
  },

  start: {
    headline: "\u0645\u0633\u0627\u0639\u062F\u0643 \u0627\u0644\u0630\u0643\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628",
    phone: "+971 58 289 6090",
    cta: "\u062A\u062D\u062F\u062B \u0645\u0639 \u063A\u0627\u0644\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628",
    trust: "\u0645\u062C\u0627\u0646\u064A \u00B7 \u0628\u062F\u0648\u0646 \u062A\u0633\u062C\u064A\u0644 \u00B7 60 \u0631\u0635\u064A\u062F/\u0634\u0647\u0631",
    switchLocale: "English",
    switchLocaleHref: "/start",
  },

  stickyWhatsApp: {
    ariaLabel: "\u062A\u062D\u062F\u062B \u0645\u0639 \u063A\u0627\u0644\u064A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628",
  },
};

export const translations = { en, ar } as const;
