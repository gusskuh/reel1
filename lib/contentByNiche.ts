/**
 * Fetch or generate content based on reel niche.
 */
import path from "path";
import { fetchMarketNews } from "../scripts/fetchNews";
import { extractTickerFromNews } from "./extractTickerSymbol";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export type Niche =
  | "financial"
  | "inspirational"
  | "health"
  | "news"
  | "fitness"
  | "finance"
  | "tech"
  | "food"
  | "relationships";

export interface ContentResult {
  title: string;
  content: string;
  tickerSymbol?: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchInspirationalContent(): Promise<ContentResult> {
  const themes = [
    "perseverance through failure",
    "taking action despite fear",
    "building daily habits",
    "embracing uncertainty",
    "the power of small steps",
    "mindset and growth",
    "overcoming setbacks",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Write a short inspirational script for a 30-second reel about "${theme}".

Requirements:
- Conversational, energetic tone
- One-line hook at the start
- 2-3 main points, punchy and memorable
- Closing line that feels complete
- No bullet points, just flowing prose
- Aim for ~80-100 words when read aloud`,
      },
    ],
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script) {
    throw new Error("Failed to generate inspirational content");
  }

  return {
    title: `Inspirational: ${theme}`,
    content: script,
  };
}

async function fetchHealthContent(): Promise<ContentResult> {
  const themes = [
    "sleep hygiene and better rest",
    "hydration and why it matters",
    "simple morning routines for energy",
    "nutrition tips for busy people",
    "managing stress through breathing",
    "the benefits of daily movement",
    "gut health and mood",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Write a short health and wellness script for a 30-second reel about "${theme}".

Requirements:
- Friendly, trustworthy tone
- One-line hook at the start
- 2-3 actionable tips, easy to remember
- Closing line that feels complete
- No bullet points, just flowing prose
- Aim for ~80-100 words when read aloud`,
      },
    ],
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script) {
    throw new Error("Failed to generate health content");
  }

  return {
    title: `Health: ${theme}`,
    content: script,
  };
}

async function fetchWorldNewsContent(): Promise<ContentResult> {
  const themes = [
    "climate action and renewable energy",
    "artificial intelligence regulation",
    "global economic trends",
    "space exploration milestones",
    "international diplomacy and peace efforts",
    "technology and privacy",
    "sustainable development goals",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Write a short world news script for a 30-second reel about "${theme}".

Requirements:
- Neutral, informative tone like a news anchor
- One-line hook at the start
- 2-3 key facts or developments
- Closing line that feels complete
- No bullet points, just flowing prose
- Aim for ~80-100 words when read aloud`,
      },
    ],
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script) {
    throw new Error("Failed to generate world news content");
  }

  return {
    title: `World News: ${theme}`,
    content: script,
  };
}

async function fetchFitnessContent(): Promise<ContentResult> {
  const themes = [
    "leg day motivation and tips",
    "post-workout recovery",
    "building a consistent gym routine",
    "protein and muscle building",
    "warm-up before lifting",
    "rest days and why they matter",
    "home workout alternatives",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Write a short fitness script for a 30-second reel about "${theme}".

Requirements:
- Energetic, motivating tone
- One-line hook at the start
- 2-3 actionable tips or motivation points
- Closing line that feels complete
- No bullet points, just flowing prose
- Aim for ~80-100 words when read aloud`,
      },
    ],
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script) throw new Error("Failed to generate fitness content");
  return { title: `Fitness: ${theme}`, content: script };
}

async function fetchPersonalFinanceContent(): Promise<ContentResult> {
  const themes = [
    "the 50-30-20 budget rule",
    "building an emergency fund",
    "side hustle ideas to start this month",
    "avoiding lifestyle creep",
    "automating your savings",
    "cutting subscriptions you don't use",
    "paying off debt fast",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Write a short personal finance script for a 30-second reel about "${theme}".

Requirements:
- Friendly, practical tone
- One-line hook at the start
- 2-3 actionable tips anyone can use
- Closing line that feels complete
- No bullet points, just flowing prose
- Aim for ~80-100 words when read aloud`,
      },
    ],
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script) throw new Error("Failed to generate personal finance content");
  return { title: `Personal Finance: ${theme}`, content: script };
}

async function fetchTechContent(): Promise<ContentResult> {
  const themes = [
    "ChatGPT tips to save time",
    "AI tools for productivity",
    "protecting your privacy online",
    "smartphone habits that waste time",
    "automation ideas for daily tasks",
    "new AI features to try",
    "digital decluttering",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Write a short tech and AI script for a 30-second reel about "${theme}".

Requirements:
- Clear, helpful tone
- One-line hook at the start
- 2-3 actionable tips or insights
- Closing line that feels complete
- No bullet points, just flowing prose
- Aim for ~80-100 words when read aloud`,
      },
    ],
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script) throw new Error("Failed to generate tech content");
  return { title: `Tech: ${theme}`, content: script };
}

async function fetchFoodContent(): Promise<ContentResult> {
  const themes = [
    "quick breakfast ideas for busy mornings",
    "meal prep tips for the week",
    "healthy snacks that keep you full",
    "one-pan dinner recipes",
    "easy high-protein meals",
    "what to eat before a workout",
    "simple swaps for healthier eating",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Write a short food and recipe script for a 30-second reel about "${theme}".

Requirements:
- Friendly, appetizing tone
- One-line hook at the start
- 2-3 tips or simple recipe ideas
- Closing line that feels complete
- No bullet points, just flowing prose
- Aim for ~80-100 words when read aloud`,
      },
    ],
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script) throw new Error("Failed to generate food content");
  return { title: `Food: ${theme}`, content: script };
}

async function fetchRelationshipsContent(): Promise<ContentResult> {
  const themes = [
    "green flags in a relationship",
    "communication tips for couples",
    "healthy boundaries in dating",
    "signs of a secure partner",
    "how to have difficult conversations",
    "building trust in new relationships",
    "what makes a relationship last",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Write a short relationship and dating advice script for a 30-second reel about "${theme}".

Requirements:
- Warm, relatable tone
- One-line hook at the start
- 2-3 helpful tips or insights
- Closing line that feels complete
- No bullet points, just flowing prose
- Aim for ~80-100 words when read aloud`,
      },
    ],
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script) throw new Error("Failed to generate relationships content");
  return { title: `Relationships: ${theme}`, content: script };
}

export async function getContentByNiche(niche: Niche): Promise<ContentResult> {
  if (niche === "inspirational") {
    return fetchInspirationalContent();
  }
  if (niche === "health") {
    return fetchHealthContent();
  }
  if (niche === "news") return fetchWorldNewsContent();
  if (niche === "fitness") return fetchFitnessContent();
  if (niche === "finance") return fetchPersonalFinanceContent();
  if (niche === "tech") return fetchTechContent();
  if (niche === "food") return fetchFoodContent();
  if (niche === "relationships") return fetchRelationshipsContent();

  // financial (default)
  const news = await fetchMarketNews();
  if (!news) {
    throw new Error("No financial news available");
  }

  const tickerSymbol = extractTickerFromNews(
    { title: news.title, content: news.content },
    news.symbol
  );

  return {
    title: news.title,
    content: news.content,
    tickerSymbol,
  };
}
