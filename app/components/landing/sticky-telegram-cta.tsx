"use client";

import { usePostHog } from "posthog-js/react";
import { useCallback } from "react";
import type { TranslationDict } from "@/app/lib/i18n/types";
import { trackGhaliChatStarted } from "@/lib/analytics";

export function StickyTelegramCta({ t }: { t: TranslationDict }) {
  const posthog = usePostHog();

  const handleClick = useCallback(() => {
    posthog?.capture("cta_clicked", {
      location: "sticky_telegram",
      href: t.telegramUrl,
    });
    window.dataLayer?.push({
      event: "cta_clicked",
      cta_location: "sticky_telegram",
      cta_href: t.telegramUrl,
    });
    trackGhaliChatStarted({ location: "sticky_telegram", href: t.telegramUrl });
  }, [posthog, t.telegramUrl]);

  return (
    <a
      href={t.telegramUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label={t.stickyTelegram.ariaLabel}
      className="fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#2AABEE] text-white shadow-lg shadow-[#2AABEE]/30 transition-transform hover:scale-110 animate-[bounce-in_0.5s_ease-out]"
    >
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    </a>
  );
}
