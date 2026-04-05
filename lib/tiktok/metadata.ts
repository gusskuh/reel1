import type { VideoMetadata } from "./types";

const NICHE_LABELS: Record<string, string> = {
  financial: "Financial News",
  news: "World News",
  health: "Health",
  fitness: "Fitness",
  finance: "Personal Finance",
  tech: "Tech & AI",
  food: "Food & Recipes",
  relationships: "Relationships",
  inspirational: "Inspiration",
};

/**
 * Metadata for a reel created in the web app (no full script stored).
 */
export function generateWebReelTikTokMetadata(niche: string): VideoMetadata {
  const label = NICHE_LABELS[niche] ?? "AI Reel";
  const title = `ReelGen — ${label}`.slice(0, 150);
  const description = `Made with ReelGen — ${label} reel.\n\n#ReelGen #valuezai #${label.replace(/\s+/g, "")}`.slice(
    0,
    2200
  );

  return {
    title,
    description,
    privacyLevel: "PUBLIC_TO_EVERYONE",
    disableDuet: false,
    disableComment: false,
    disableStitch: false,
    videoCoverTimestamp: 1000,
  };
}
