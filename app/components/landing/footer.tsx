import Image from "next/image";
import Link from "next/link";
import type { TranslationDict } from "@/app/lib/i18n/types";

export function Footer({ t }: { t: TranslationDict }) {
  const homeHref = t.locale === "ar" ? "/ar" : "/";

  return (
    <footer className="border-t border-white/5 px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 py-6 text-sm text-white/40 sm:flex-row">
        <Link href={homeHref} className="flex items-center gap-3">
          <Image
            src="/ghali-logo-no-bg.svg"
            alt="Ghali"
            width={24}
            height={24}
          />
          <span className="font-semibold text-white">ghali.ae</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-6">
          <Link href={t.footer.featuresHref} className="transition-colors hover:text-white">
            {t.footer.features}
          </Link>
          <Link href={t.footer.feedbackHref} className="transition-colors hover:text-white">
            {t.footer.feedback}
          </Link>
          <Link href={t.footer.privacyHref} className="transition-colors hover:text-white">
            {t.footer.privacy}
          </Link>
          <Link href={t.footer.termsHref} className="transition-colors hover:text-white">
            {t.footer.terms}
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl py-8 text-center text-sm text-white/30 space-y-2">
        <p>{t.footer.copyright}</p>
        <p>{t.footer.tagline}</p>
        <p>{t.footer.madeWith}</p>
      </div>
    </footer>
  );
}
