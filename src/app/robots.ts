import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://manaratscience.club";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/cms",
          "/profile",
          "/signin",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/api/",
        ],
      },
      {
        // SEO data-miners and mass scrapers: they crawl every URL the sitemap lists and
        // return the club nothing, so each pass is billed CDN requests. Search engines
        // and the AI crawlers are deliberately left alone — answer-engine visibility is a
        // stated goal of this site (see [[workflows/seo-aeo]]), so blocking those is a
        // trade the club has to choose, not a default.
        userAgent: [
          "AhrefsBot",
          "SemrushBot",
          "MJ12bot",
          "DotBot",
          "PetalBot",
          "ZoomBot",
          "Bytespider",
          "DataForSeoBot",
          "Sogou web spider",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
