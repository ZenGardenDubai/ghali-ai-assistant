import Image from "next/image";
import Link from "next/link";
import { CtaButton } from "./cta-button";
import { GitHubIcon, WhatsAppIcon } from "./icons";
import type { TranslationDict } from "@/app/lib/i18n/types";

export function Nav({ t }: { t: TranslationDict }) {
  const homeHref = t.locale === "ar" ? "/ar" : "/";

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={homeHref} className="flex items-center gap-3">
          <Image
            src="/ghali-logo-no-bg.svg"
            alt="Ghali"
            width={36}
            height={36}
          />
          <span className="text-xl font-semibold tracking-tight">Ghali</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={t.footer.featuresHref}
            className="hidden text-sm text-white/40 transition-colors hover:text-white sm:block"
          >
            {t.nav.features}
          </Link>
          <a
            href="https://github.com/ZenGardenDubai/ghali-ai-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 transition-colors hover:text-white"
            aria-label="GitHub"
          >
            <GitHubIcon className="h-5 w-5" />
          </a>
          <CtaButton
            href={t.whatsappUrl}
            location="nav"
            className="group flex items-center gap-2 rounded-full bg-[#ED6B23] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
          >
            <WhatsAppIcon className="h-4 w-4" />
            {t.nav.startChatting}
          </CtaButton>
        </div>
      </div>
    </nav>
  );
}
