import type { Metadata } from "next";
import "@/app/globals.css";
import { fontVariables, sharedMetadata, RootProviders } from "@/app/lib/root-layout";

export const metadata: Metadata = sharedMetadata;

export default function ArRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${fontVariables} antialiased`}>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
