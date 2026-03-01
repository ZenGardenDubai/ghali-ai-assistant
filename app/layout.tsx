import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import "./globals.css";
import { PostHogProvider } from "./providers/posthog";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://ghali.ae"),
  title: {
    default: "Ghali — Your AI Assistant on WhatsApp",
    template: "%s — Ghali",
  },
  description:
    "Ghali is a WhatsApp-first AI assistant. Chat, generate images, analyze documents, and more. No app to install — just message and go.",
  keywords: [
    "AI assistant",
    "WhatsApp AI",
    "AI chatbot",
    "document analysis",
    "image generation",
    "voice notes",
    "personal AI",
    "Dubai AI",
    "Ghali",
  ],
  authors: [{ name: "SAHEM DATA TECHNOLOGY" }],
  creator: "SAHEM DATA TECHNOLOGY",
  publisher: "SAHEM DATA TECHNOLOGY",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ghali.ae",
    siteName: "Ghali",
    title: "Ghali — Your AI Assistant on WhatsApp",
    description:
      "Ghali is a WhatsApp-first AI assistant. Chat, generate images, analyze documents, and more. No app to install — just message and go.",
    images: [
      {
        url: "/ghali-logo-with-bg.png",
        width: 640,
        height: 640,
        alt: "Ghali — AI Assistant on WhatsApp",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Ghali — Your AI Assistant on WhatsApp",
    description:
      "Ghali is a WhatsApp-first AI assistant. Chat, generate images, analyze documents, and more.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <ClerkProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ClerkProvider>
        {gtmId && (
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
        )}
      </body>
    </html>
  );
}
