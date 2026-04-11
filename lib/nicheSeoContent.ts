/**
 * Per-niche SEO + landing hero copy (no Next.js imports — safe for client bundles).
 */
import type { Niche } from "./nicheConfig";

export const NICHE_SEO: Record<
  Niche,
  { description: string; keywords: string[]; heroLead: string }
> = {
  financial: {
    description:
      "Turn live market headlines into vertical reels with AI script, voice, captions, and finance-themed b-roll—built for stock and investing creators.",
    keywords: [
      "stock news reel generator",
      "finance TikTok AI",
      "market headline video",
      "investing reel maker",
      "NYSE NASDAQ reel",
    ],
    heroLead:
      "Stock and market headlines become ready-to-post vertical videos—ticker-aware banner, voice, and captions included.",
  },
  general: {
    description:
      "Generate general US news reels from top headlines: AI script, narration, subtitles, and scene cuts—optimized for short-form social.",
    keywords: ["general news reel", "headline reel generator", "AI news short video"],
    heroLead: "Top general-news headlines turned into punchy vertical reels for social feeds.",
  },
  world: {
    description:
      "Create world-news reels from current US-sourced headlines with AI voice, captions, and b-roll—built for global-story creators.",
    keywords: ["world news reel", "international news AI video", "global news Shorts"],
    heroLead: "World and international stories packaged as scroll-stopping vertical videos.",
  },
  nation: {
    description:
      "Turn US national news headlines into AI reels with voiceover, burned-in captions, and relevant stock footage.",
    keywords: ["US news reel", "national news AI video", "America headline Shorts"],
    heroLead: "National and US-focused headlines, ready as narrated reels with captions.",
  },
  business: {
    description:
      "Business and economy headlines to AI reels—professional tone, captions, voice, and office or market visuals.",
    keywords: ["business news reel", "economy TikTok AI", "corporate headline video"],
    heroLead: "Business headlines distilled into tight, professional vertical videos.",
  },
  technology: {
    description:
      "Technology category headlines become AI reels with script, TTS, subtitles, and tech-themed b-roll.",
    keywords: ["tech news reel", "AI TikTok generator tech", "technology Shorts maker"],
    heroLead: "Tech headlines → scripted, voiced reels with captions and visuals.",
  },
  entertainment: {
    description:
      "Entertainment news to vertical reels—AI script, voice, captions, and scene cuts for pop-culture creators.",
    keywords: ["entertainment reel AI", "celebrity news Shorts", "pop culture TikTok video"],
    heroLead: "Showbiz and entertainment headlines as shareable vertical reels.",
  },
  sports: {
    description:
      "Sports headlines to AI reels: narration, subtitles, and athletic b-roll for TikTok, Reels, and Shorts.",
    keywords: ["sports news reel", "sports highlight AI video", "athletics Shorts generator"],
    heroLead: "Sports stories turned into fast, voiced reels with on-screen captions.",
  },
  science: {
    description:
      "Science and discovery headlines as AI reels—clear narration, captions, and relevant visuals.",
    keywords: ["science news reel", "STEM TikTok AI", "science Shorts"],
    heroLead: "Science and research headlines explained in short, engaging vertical format.",
  },
  health: {
    description:
      "Health category headlines to AI reels with careful, clear voiceover and readable captions.",
    keywords: ["health news reel", "wellness Shorts AI", "medical headline video"],
    heroLead: "Health and wellness headlines as accessible, captioned vertical videos.",
  },
};
