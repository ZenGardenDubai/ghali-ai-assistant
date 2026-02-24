import Image from "next/image";
import Link from "next/link";

const WHATSAPP_URL = "https://wa.me/971582896090?text=Hi%20Ghali";

export function FeaturePage({
  badge,
  title,
  subtitle,
  children,
  jsonLd,
}: {
  badge: string;
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  jsonLd?: Record<string, unknown>;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0f1e] text-white">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/ghali-logo-no-bg.svg" alt="Ghali" width={36} height={36} />
            <span className="text-xl font-semibold tracking-tight">Ghali</span>
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#ED6B23] px-5 py-2.5 text-sm font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-lg hover:shadow-[#ED6B23]/20"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Start Chatting
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="pointer-events-none absolute top-0 left-1/2 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ED6B23]/20 bg-[#ED6B23]/5 px-4 py-1.5 text-sm text-[#ED6B23]">
            {badge}
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/50">
            {subtitle}
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 pb-24">
        {children}
      </div>

      {/* CTA */}
      <section className="relative px-6 py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-[#ED6B23]/10 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Ready to try <span className="text-[#ED6B23]">Ghali</span>?
          </h2>
          <p className="mt-4 text-white/50">
            No app. No signup. Just send a message.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[#ED6B23] px-8 py-4 text-lg font-semibold transition-all hover:bg-[#d45e1f] hover:shadow-xl hover:shadow-[#ED6B23]/25"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Start Chatting
            <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 py-6 text-sm text-white/40 sm:flex-row">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/ghali-logo-no-bg.svg" alt="Ghali" width={20} height={20} />
            <span className="font-semibold text-white">ghali.ae</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-white">Terms of Service</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl py-8 text-center text-sm text-white/30 space-y-2">
          <p>&copy; 2026 SAHEM DATA TECHNOLOGY. All rights reserved.</p>
          <p>ghali.ae is a product of SAHEM DATA TECHNOLOGY, Dubai, UAE</p>
          <p>Made with ❤️ in the UAE 🇦🇪</p>
        </div>
      </footer>
    </div>
  );
}

export function FeatureSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-12">
      {title && (
        <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
      )}
      <div className="text-white/60 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-[#ED6B23]/20 hover:bg-white/[0.04]">
      <div className="mb-3 text-2xl">{icon}</div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/50">{description}</p>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
