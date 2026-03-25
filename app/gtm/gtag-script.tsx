import Script from "next/script";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID;
const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;
const GADS_ID_PATTERN = /^AW-\d+$/;

/**
 * Standalone gtag.js loader for GA4 + Google Ads conversion tracking.
 * Runs alongside GTM — GTM handles container tags, this handles direct
 * gtag("event", …) calls from client code (e.g. trackGhaliChatStarted).
 */
export function GtagScript() {
	if (!GA_MEASUREMENT_ID || !GA_ID_PATTERN.test(GA_MEASUREMENT_ID)) return null;

	const configLines = [`gtag('config', '${GA_MEASUREMENT_ID}');`];
	if (GADS_ID && GADS_ID_PATTERN.test(GADS_ID)) {
		configLines.push(`gtag('config', '${GADS_ID}');`);
	}

	return (
		<>
			<Script
				id="gtag-js"
				strategy="afterInteractive"
				src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
			/>
			<Script
				id="gtag-init"
				strategy="afterInteractive"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: gtag bootstrap requires inline initialization snippet.
				dangerouslySetInnerHTML={{
					__html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${configLines.join("")}`,
				}}
			/>
		</>
	);
}
