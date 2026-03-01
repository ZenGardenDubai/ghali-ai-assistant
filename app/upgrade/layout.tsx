import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upgrade to Pro",
  description:
    "Upgrade to Ghali Pro for 600 messages per month, scheduled tasks, proactive check-ins, and priority access to top-tier AI models.",
  robots: { index: false, follow: false },
};

export default function UpgradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
