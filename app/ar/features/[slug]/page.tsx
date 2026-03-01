import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeaturePage, FeatureSection, FeatureCard } from "@/app/components/landing/feature-page";
import { featurePages, ALL_FEATURE_SLUGS, type FeatureSlug, type FeaturePageContent } from "@/app/lib/i18n/feature-translations";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return ALL_FEATURE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = featurePages[slug as FeatureSlug];
  if (!page) return {};
  const content: FeaturePageContent = page.ar;

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: {
      canonical: `https://ghali.ae/ar/features/${slug}`,
      languages: {
        en: `https://ghali.ae/features/${slug}`,
        ar: `https://ghali.ae/ar/features/${slug}`,
      },
    },
    openGraph: {
      title: `${content.metaTitle} \u2014 \u063A\u0627\u0644\u064A`,
      description: content.metaDescription,
      url: `https://ghali.ae/ar/features/${slug}`,
      locale: "ar_AE",
      images: [{ url: "/ghali-logo-with-bg.png", width: 640, height: 640, alt: "\u063A\u0627\u0644\u064A" }],
    },
  };
}

export default async function ArFeaturePage({ params }: Props) {
  const { slug } = await params;
  const page = featurePages[slug as FeatureSlug];
  if (!page) notFound();

  const content: FeaturePageContent = page.ar;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629", item: "https://ghali.ae/ar" },
      { "@type": "ListItem", position: 2, name: "\u0627\u0644\u0645\u0632\u0627\u064A\u0627", item: "https://ghali.ae/ar/features" },
      { "@type": "ListItem", position: 3, name: content.breadcrumb, item: `https://ghali.ae/ar/features/${slug}` },
    ],
  };

  return (
    <FeaturePage
      jsonLd={breadcrumbJsonLd}
      badge={content.badge}
      title={
        <>
          {content.title} <span className="text-[#ED6B23]">{content.titleHighlight}</span>
        </>
      }
      subtitle={content.subtitle}
      locale="ar"
    >
      {content.sections.map((section, i) => {
        if (section.githubButton) {
          return (
            <div key={i} className="mt-8 text-center">
              <a
                href="https://github.com/ZenGardenDubai/ghali-ai-assistant"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-full border border-white/10 px-8 py-4 text-lg font-medium transition-all hover:border-[#ED6B23]/40 hover:bg-[#ED6B23]/10 hover:text-[#ED6B23]"
              >
                {"\u0634\u0648\u0641 \u0639\u0644\u0649 GitHub"} &larr;
              </a>
            </div>
          );
        }

        return (
          <FeatureSection key={i} title={section.title}>
            {section.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}

            {section.cards && (
              <div className={`grid gap-4 ${section.cards.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                {section.cards.map((card) => (
                  <FeatureCard key={card.title} icon={card.icon} title={card.title} description={card.description} />
                ))}
              </div>
            )}

            {section.listItems && (
              <ul className="space-y-2">
                {section.listItems.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="mt-1 text-[#ED6B23]">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {section.infoBox && (
              <div className="rounded-xl border border-[#ED6B23]/20 bg-[#ED6B23]/5 p-6 text-sm text-white/60">
                {section.infoBox}
              </div>
            )}
          </FeatureSection>
        );
      })}
    </FeaturePage>
  );
}
