import type { VideoMetadata } from "./types";
import { NICHE_OPTIONS, type Niche } from "../nicheConfig";

const NICHE_LABELS: Record<Niche, string> = Object.fromEntries(
  NICHE_OPTIONS.map((o) => [o.value, o.label])
) as Record<Niche, string>;

const NICHE_HASHTAGS: Record<Niche, string[]> = {
  financial: ["StockMarket", "Finance", "Investing", "Stocks"],
  general: ["News", "BreakingNews", "DailyNews"],
  world: ["WorldNews", "GlobalNews", "International"],
  nation: ["USNews", "NationalNews", "America"],
  business: ["Business", "Economy", "Markets"],
  technology: ["Tech", "Technology", "AI"],
  entertainment: ["Entertainment", "Celebrity", "PopCulture"],
  sports: ["Sports", "SportsNews", "Highlights"],
  science: ["Science", "ScienceNews", "Research"],
  health: ["Health", "Wellness", "HealthNews"],
};

function nicheHashtagSlug(label: string): string {
  return label.replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Caption + hashtags for TikTok.
 * Inbox upload cannot send this via API — show in UI for the creator to paste.
 * Direct Post (video.publish) can send it later in post_info.title.
 */
export function generateWebReelTikTokMetadata(niche: string): VideoMetadata {
  const label = NICHE_LABELS[niche as Niche] ?? "AI Reel";
  const tags = NICHE_HASHTAGS[niche as Niche] ?? [nicheHashtagSlug(label)];
  const hashtagLine = [
    "#ReelGen",
    ...tags.map((t) => `#${t}`),
    "#fyp",
    "#viral",
  ].join(" ");

  const title = `${label} reel — made with ReelGen`.slice(0, 150);
  const description = `${title}\n\n${hashtagLine}`.slice(0, 2200);

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

/** Short paste-ready caption for the TikTok editor (inbox flow). */
export function tiktokPasteCaption(meta: VideoMetadata): string {
  return (meta.description || meta.title).trim();
}
