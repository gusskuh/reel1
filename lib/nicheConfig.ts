/**
 * Reel niches: Stocks News uses FMP; all others map to GNews top-headlines categories.
 * @see https://docs.gnews.io/
 */
export const GNEWS_CATEGORY_ORDER = [
  "general",
  "world",
  "nation",
  "business",
  "technology",
  "entertainment",
  "sports",
  "science",
  "health",
] as const;

export type GNewsCategory = (typeof GNEWS_CATEGORY_ORDER)[number];

export const ALL_NICHES = ["financial", ...GNEWS_CATEGORY_ORDER] as const;
export type Niche = (typeof ALL_NICHES)[number];

export function isValidNiche(value: string): value is Niche {
  return (ALL_NICHES as readonly string[]).includes(value);
}

export function isGNewsCategory(niche: Niche): niche is GNewsCategory {
  return niche !== "financial";
}

export const NICHE_OPTIONS: { value: Niche; label: string }[] = [
  { value: "financial", label: "Stocks News" },
  ...GNEWS_CATEGORY_ORDER.map((c) => ({
    value: c,
    label: c.charAt(0).toUpperCase() + c.slice(1),
  })),
];

export function nicheDisplayLabel(niche: Niche): string {
  const hit = NICHE_OPTIONS.find((o) => o.value === niche);
  return hit?.label ?? niche;
}

/** Pexels / scene search hints per niche */
export const SCENE_KEYWORDS: Record<Niche, string> = {
  financial: "financial news stock market",
  general: "news headlines journalism",
  world: "world news international globe",
  nation: "america usa news washington",
  business: "business corporate office",
  technology: "technology software innovation",
  entertainment: "entertainment music movies",
  sports: "sports stadium athletics",
  science: "science laboratory space research",
  health: "health medical wellness",
};
