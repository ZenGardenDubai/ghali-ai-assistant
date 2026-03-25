import { Geist, Geist_Mono, Instrument_Serif, Noto_Sans_Arabic } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { PostHogProvider } from "@/app/providers/posthog";
import { GtmScript } from "@/app/gtm/gtm-script";
import { GtmNoScript } from "@/app/gtm/gtm-noscript";
import { GtagScript } from "@/app/gtm/gtag-script";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const notoSansArabic = Noto_Sans_Arabic({
  weight: ["400", "700"],
  subsets: ["arabic"],
  variable: "--font-arabic",
});

export const fontVariables = `${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${notoSansArabic.variable}`;

export const sharedMetadata: Metadata = {
  metadataBase: new URL("https://ghali.ae"),
  title: {
    default: "Ghali — Your AI Assistant on Telegram",
    template: "%s — Ghali",
  },
  description:
    "Ghali is an AI assistant on Telegram (formerly WhatsApp). Chat, generate images, analyze documents, and more. No app to install — just message and go.",
  keywords: [
    "AI assistant",
    "Telegram AI",
    "Telegram bot",
    "Telegram AI assistant",
    "WhatsApp AI",
    "AI chatbot",
    "document analysis",
    "image generation",
    "voice notes",
    "personal AI",
    "Dubai AI",
    "UAE AI assistant",
    "Ghali",
    "Ghali AI",
  ],
  authors: [{ name: "SAHEM DATA TECHNOLOGY" }],
  creator: "SAHEM DATA TECHNOLOGY",
  publisher: "SAHEM DATA TECHNOLOGY",
  openGraph: {
    type: "website",
    locale: "en_AE",
    url: "https://ghali.ae",
    siteName: "Ghali",
    title: "Ghali — Your AI Assistant on Telegram",
    description:
      "Ghali is an AI assistant on Telegram (formerly WhatsApp). Chat, generate images, analyze documents, and more. No app to install — just message and go.",
    images: [
      {
        url: "/ghali-logo-with-bg.png",
        width: 640,
        height: 640,
        alt: "Ghali — AI Assistant on Telegram",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ghali — Your AI Assistant on Telegram",
    description:
      "Ghali is an AI assistant on Telegram (formerly WhatsApp). Chat, generate images, analyze documents, and more.",
    images: ["/ghali-logo-with-bg.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://ghali.ae",
  },
  other: {
    "msapplication-TileColor": "#ED6B23",
  },
};

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GtmScript />
      <GtmNoScript />
      <GtagScript />
      <ClerkProvider>
        <PostHogProvider>{children}</PostHogProvider>
      </ClerkProvider>
    </>
  );
}
