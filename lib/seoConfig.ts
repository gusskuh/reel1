/**
 * SEO: metadata, keywords, Open Graph / Twitter defaults, JSON-LD builders.
 * Set NEXT_PUBLIC_SITE_URL in production (canonical URLs & social cards).
 */
import type { Metadata } from "next";
import { ALL_NICHES, type Niche, nicheDisplayLabel } from "./nicheConfig";
import { NICHE_SEO } from "./nicheSeoContent";

export { NICHE_SEO };

export const SITE_NAME = "ReelGen";

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "https://www.reelgenz.app";
}

const DEFAULT_DESCRIPTION =
  "Create vertical AI reels from stock market headlines or US news categories—script, voiceover, captions, and b-roll in one click. For TikTok, Instagram Reels, and YouTube Shorts.";

export const DEFAULT_KEYWORDS = [
  "AI reel generator",
  "AI reels maker",
  "Instagram Reels AI",
  "TikTok AI video generator",
  "YouTube Shorts generator",
  "AI news reel",
  "stock news reel",
  "automatic captions reel",
  "AI voiceover video",
  "vertical video AI",
  "faceless reel generator",
  "short form video AI",
] as const;

export function rootLayoutMetadata(): Metadata {
  const base = getSiteUrl();
  const ogImage = `${base}/og.svg`;

  return {
    metadataBase: new URL(base),
    title: {
      default: `${SITE_NAME} — AI reel generator for TikTok, Reels & Shorts`,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    keywords: [...DEFAULT_KEYWORDS],
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: base }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: { email: false, address: false, telephone: false },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: base,
      siteName: SITE_NAME,
      title: `${SITE_NAME} — AI reel generator`,
      description: DEFAULT_DESCRIPTION,
      images: [{ url: "/og.svg", width: 1200, height: 630, alt: `${SITE_NAME} — AI reels` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — AI reel generator`,
      description: DEFAULT_DESCRIPTION,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    category: "technology",
  };
}

export function homePageMetadata(): Metadata {
  return {
    title: `${SITE_NAME} — AI reel generator for TikTok, Reels & Shorts`,
    description: DEFAULT_DESCRIPTION,
    keywords: [...DEFAULT_KEYWORDS],
    alternates: { canonical: "/" },
    openGraph: {
      url: getSiteUrl(),
      title: `${SITE_NAME} — AI reel generator`,
      description: DEFAULT_DESCRIPTION,
    },
    twitter: {
      title: `${SITE_NAME} — AI reel generator`,
      description: DEFAULT_DESCRIPTION,
    },
  };
}

export function nichePageMetadata(niche: Niche): Metadata {
  const label = nicheDisplayLabel(niche);
  const { description, keywords } = NICHE_SEO[niche];
  const base = getSiteUrl();
  const path = `/reels/${niche}`;
  const title = `${label} AI reels — ${SITE_NAME}`;
  const ogImage = `${base}/og.svg`;

  return {
    title,
    description,
    keywords: [...keywords, ...DEFAULT_KEYWORDS],
    alternates: { canonical: path },
    openGraph: {
      url: path,
      title,
      description,
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      images: [{ url: "/og.svg", width: 1200, height: 630, alt: `${label} — ${SITE_NAME}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export function allNichePaths(): Niche[] {
  return [...ALL_NICHES];
}

// --- JSON-LD (schema.org) ---

export function jsonLdOrganization() {
  const base = getSiteUrl();
  return {
    "@type": "Organization",
    "@id": `${base}#organization`,
    name: SITE_NAME,
    url: base,
    description: DEFAULT_DESCRIPTION,
  };
}

export function jsonLdSoftwareApplication() {
  const base = getSiteUrl();
  return {
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier with usage limits",
    },
    description: DEFAULT_DESCRIPTION,
    url: base,
  };
}

export function jsonLdWebPageNiche(niche: Niche) {
  const base = getSiteUrl();
  const label = nicheDisplayLabel(niche);
  const path = `/reels/${niche}`;
  const { description } = NICHE_SEO[niche];
  return {
    "@type": "WebPage",
    name: `${label} AI reels — ${SITE_NAME}`,
    description,
    url: `${base}${path}`,
    isPartOf: { "@id": `${base}#website` },
    inLanguage: "en-US",
  };
}

export function jsonLdWebSiteNode() {
  const base = getSiteUrl();
  return {
    "@type": "WebSite",
    "@id": `${base}#website`,
    name: SITE_NAME,
    url: base,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en-US",
    publisher: { "@id": `${base}#organization` },
  };
}

export function jsonLdBreadcrumbNiche(niche: Niche) {
  const base = getSiteUrl();
  const label = nicheDisplayLabel(niche);
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      { "@type": "ListItem", position: 2, name: `${label} reels`, item: `${base}/reels/${niche}` },
    ],
  };
}

export function jsonLdFaqHome() {
  return {
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is ReelGen?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ReelGen is a web app that builds vertical AI reels from news—stock headlines via market data or US top headlines by category—with script, text-to-speech, burned-in captions, and b-roll scenes.",
        },
      },
      {
        "@type": "Question",
        name: "Which platforms are the reels for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Exports are vertical (9:16), suited for TikTok, Instagram Reels, and YouTube Shorts.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need an account to try it?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can generate reels from the homepage without signing up, subject to the site’s rate limits.",
        },
      },
    ],
  };
}

export function nicheLandingJsonLdGraph(niche: Niche) {
  return {
    "@context": "https://schema.org",
    "@graph": [jsonLdWebPageNiche(niche), jsonLdBreadcrumbNiche(niche)],
  };
}

export function rootJsonLdGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [jsonLdWebSiteNode(), jsonLdOrganization(), jsonLdSoftwareApplication()],
  };
}

export function homeFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    ...jsonLdFaqHome(),
  };
}
