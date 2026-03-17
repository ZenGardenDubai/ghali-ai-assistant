import type { Metadata } from "next";
import "@/app/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { PostHogProvider } from "@/app/providers/posthog";
import { fontVariables } from "@/app/lib/root-layout";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Ghali",
  robots: { index: false, follow: false },
};

export default function TelegramMiniAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${fontVariables} antialiased`}>
        <ClerkProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
