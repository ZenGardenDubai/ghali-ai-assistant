import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://ghali.ae",
      lastModified: "2026-02-22",
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://ghali.ae/features",
      lastModified: "2026-02-22",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://ghali.ae/features/zero-friction",
      lastModified: "2026-02-22",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://ghali.ae/features/personal-memory",
      lastModified: "2026-02-22",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://ghali.ae/features/privacy",
      lastModified: "2026-02-22",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://ghali.ae/features/smart-ai",
      lastModified: "2026-02-22",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://ghali.ae/features/understand-anything",
      lastModified: "2026-02-22",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://ghali.ae/features/image-generation",
      lastModified: "2026-02-22",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://ghali.ae/features/documents",
      lastModified: "2026-02-22",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://ghali.ae/features/scheduled-tasks",
      lastModified: "2026-03-01",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://ghali.ae/features/track-everything",
      lastModified: "2026-02-27",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://ghali.ae/features/prowrite",
      lastModified: "2026-02-28",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://ghali.ae/features/open-source",
      lastModified: "2026-02-22",
      changeFrequency: "monthly",
      priority: 0.7,
    },
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
