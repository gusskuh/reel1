import type { VideoMetadata } from "./types";
import { NICHE_OPTIONS, type Niche } from "../nicheConfig";

const NICHE_LABELS: Record<Niche, string> = Object.fromEntries(
  NICHE_OPTIONS.map((o) => [o.value, o.label])
) as Record<Niche, string>;

/**
 * Metadata for a reel created in the web app (no full script stored).
 */
export function generateWebReelTikTokMetadata(niche: string): VideoMetadata {
  const label = NICHE_LABELS[niche as Niche] ?? "AI Reel";
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
