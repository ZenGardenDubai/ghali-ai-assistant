import type { MetadataRoute } from "next";
import { ALL_FEATURE_SLUGS } from "./lib/i18n/feature-translations";

const TODAY = "2026-03-01";

export default function sitemap(): MetadataRoute.Sitemap {
  const featureSlugs = ALL_FEATURE_SLUGS;

  return [
    // EN pages
    {
      url: "https://ghali.ae",
      lastModified: TODAY,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://ghali.ae/start",
      lastModified: TODAY,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://ghali.ae/features",
      lastModified: "2026-02-22",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...featureSlugs.map((slug) => ({
      url: `https://ghali.ae/features/${slug}`,
      lastModified: TODAY,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // AR pages
    {
      url: "https://ghali.ae/ar",
      lastModified: TODAY,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://ghali.ae/ar/start",
      lastModified: TODAY,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://ghali.ae/ar/features",
      lastModified: TODAY,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...featureSlugs.map((slug) => ({
      url: `https://ghali.ae/ar/features/${slug}`,
      lastModified: TODAY,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Static pages
    {
      url: "https://ghali.ae/privacy",
      lastModified: "2026-02-22",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://ghali.ae/terms",
      lastModified: "2026-02-22",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
