"use client";

import { usePostHog } from "posthog-js/react";
import { useCallback } from "react";

interface CtaButtonProps {
  href: string;
  location: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A client component wrapper for CTA links that tracks clicks via PostHog.
 * Fires a "cta_clicked" event with the button location before navigating.
 */
export function CtaButton({ href, location, children, className }: CtaButtonProps) {
  const posthog = usePostHog();

  const handleClick = useCallback(() => {
    posthog?.capture("cta_clicked", {
      location,
      href,
    });
    if (typeof window !== "undefined") {
      (window as Window & { dataLayer?: unknown[] }).dataLayer?.push({
        event: "whatsapp_cta_clicked",
        cta_location: location,
        cta_href: href,
      });
    }
  }, [posthog, location, href]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
