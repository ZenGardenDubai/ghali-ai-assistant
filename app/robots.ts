import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/upgrade", "/api/"],
      },
    ],
    sitemap: "https://ghali.ae/sitemap.xml",
  };
}
