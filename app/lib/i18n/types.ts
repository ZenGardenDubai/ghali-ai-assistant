export type Locale = "en" | "ar";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface UseCase {
  icon: string;
  title: string;
  desc: string;
}

export interface StrengthCard {
  icon: string; // icon key from icons.tsx
  title: string;
  description: string;
  href: string;
  /** grid span: "2" for lg:col-span-2, "3" for lg:col-span-3, etc. */
  colSpan?: string;
  /** for horizontal layout cards */
  horizontal?: boolean;
  /** use cases sub-grid (only for "one assistant" card) */
  useCases?: UseCase[];
  /** inline link text (only for "open source" card) */
  linkText?: string;
}

export interface HowItWorksStep {
  num: string;
  title: string;
  desc: string;
}

export interface CapabilityItem {
  icon: string;
  title: string;
  desc: string;
  href: string;
}

export interface PricingFeature {
  text: string;
  highlight?: boolean;
}

export interface TranslationDict {
  locale: Locale;
  dir: "ltr" | "rtl";
  whatsappUrl: string;

  // Nav
  nav: {
    features: string;
    startChatting: string;
  };

  // Hero
  hero: {
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    cta: string;
    trust: string;
  };

  // Strengths
  strengths: {
    label: string;
    cards: StrengthCard[];
  };

  // How it works
  howItWorks: {
    label: string;
    steps: HowItWorksStep[];
  };

  // Capabilities
  capabilities: {
    label: string;
    items: CapabilityItem[];
  };

  // Explore features bridge
  exploreFeatures: {
    tagline: string;
    title: string;
    description: string;
    cta: string;
    href: string;
  };

  // Pricing
  pricing: {
    label: string;
    basic: {
      name: string;
      price: string;
      features: PricingFeature[];
      cta: string;
    };
    pro: {
      name: string;
      badge: string;
      pricePrimary: string;
      pricePeriod: string;
      priceSecondary: string;
      priceAlt: string;
      features: PricingFeature[];
      cta: string;
    };
  };

  // FAQ
  faq: {
    label: string;
    items: FaqItem[];
  };

  // Final CTA
  finalCta: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    cta: string;
  };

  // Footer
  footer: {
    features: string;
    feedback: string;
    privacy: string;
    terms: string;
    copyright: string;
    tagline: string;
    madeWith: string;
    privacyHref: string;
    termsHref: string;
    featuresHref: string;
    feedbackHref: string;
  };

  // Start page
  start: {
    headline: string;
    phone: string;
    cta: string;
    trust: string;
    switchLocale: string;
    switchLocaleHref: string;
  };

  // Sticky WhatsApp CTA
  stickyWhatsApp: {
    ariaLabel: string;
  };
}
