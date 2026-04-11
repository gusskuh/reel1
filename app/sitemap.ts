import type { MetadataRoute } from "next";
import { getSiteUrl, allNichePaths } from "@/lib/seoConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const nichePages: MetadataRoute.Sitemap = allNichePaths().map((niche) => ({
    url: `${base}/reels/${niche}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  return [...staticPages, ...nichePages];
}
