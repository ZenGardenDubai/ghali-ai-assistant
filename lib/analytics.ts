import posthog from "posthog-js";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface ChatStartedProps {
  location: string;
  href: string;
}

/**
 * Fires the `ghali_chat_started` conversion event once per device.
 * Subsequent calls are no-ops to prevent overcounting in Google Ads.
 */
export function trackGhaliChatStarted(props: ChatStartedProps): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("ghali_conv_fired")) return;
  localStorage.setItem("ghali_conv_fired", "1");

  posthog.capture("ghali_chat_started", { ...props });

  if (window.gtag) {
    window.gtag("event", "ghali_chat_started", { ...props });
  }
}
