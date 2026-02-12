import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/demo/",
          "/auth/",
          "/suite/",
          "/onboarding/",
        ],
      },
    ],
    sitemap: "https://dreamteam.ai/sitemap.xml",
  };
}
