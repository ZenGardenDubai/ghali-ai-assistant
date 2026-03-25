import posthog from "posthog-js";

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
	}
}

const GADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GADS_CONVERSION_LABEL;

interface ChatStartedProps {
	location: string;
	href: string;
}

/**
 * Fires the `ghali_chat_started` conversion event once per device.
 * Sends to: PostHog, GA4 (via gtag), and Google Ads (direct conversion tag).
 * Subsequent calls are no-ops to prevent overcounting.
 */
export function trackGhaliChatStarted(props: ChatStartedProps): void {
	if (typeof window === "undefined") return;
	if (localStorage.getItem("ghali_conv_fired")) return;
	localStorage.setItem("ghali_conv_fired", "1");

	posthog.capture("ghali_chat_started", { ...props });

	if (window.gtag) {
		// GA4 event
		window.gtag("event", "ghali_chat_started", { ...props });

		// Google Ads direct conversion tag
		if (GADS_CONVERSION_LABEL) {
			window.gtag("event", "conversion", {
				send_to: GADS_CONVERSION_LABEL,
			});
		}
	}
}
