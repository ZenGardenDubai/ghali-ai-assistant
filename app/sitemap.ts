import type { MetadataRoute } from "next";
import { ALL_FEATURE_SLUGS } from "./lib/i18n/feature-translations";

const BUILD_DATE = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const featureSlugs = ALL_FEATURE_SLUGS;

  return [
    // EN pages
    {
      url: "https://ghali.ae",
      lastModified: BUILD_DATE,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://ghali.ae/start",
      lastModified: BUILD_DATE,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://ghali.ae/features",
      lastModified: BUILD_DATE,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...featureSlugs.map((slug) => ({
      url: `https://ghali.ae/features/${slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // AR pages
    {
      url: "https://ghali.ae/ar",
      lastModified: BUILD_DATE,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://ghali.ae/ar/start",
      lastModified: BUILD_DATE,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://ghali.ae/ar/features",
      lastModified: BUILD_DATE,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...featureSlugs.map((slug) => ({
      url: `https://ghali.ae/ar/features/${slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Static pages
    {
      url: "https://ghali.ae/privacy",
      lastModified: BUILD_DATE,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://ghali.ae/terms",
      lastModified: BUILD_DATE,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
