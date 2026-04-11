/**
 * GNews API v4 top headlines (US, English). Category values match GNews docs.
 * @see https://docs.gnews.io/
 */
import axios from "axios";
import type { GNewsCategory } from "./nicheConfig";

export interface GNewsArticlePick {
  title: string;
  content: string;
}

export async function fetchGNewsArticle(category: GNewsCategory): Promise<GNewsArticlePick | null> {
  const apiKey = process.env.G_NEWS_IO?.trim();
  if (!apiKey) {
    console.error("G_NEWS_IO is not set");
    return null;
  }

  try {
    const res = await axios.get<{
      articles?: Array<{ title?: string; description?: string; content?: string }>;
      errors?: string[];
    }>("https://gnews.io/api/v4/top-headlines", {
      params: {
        category,
        country: "us",
        lang: "en",
        max: 20,
        apikey: apiKey,
      },
      timeout: 20_000,
    });

    if (res.data.errors?.length) {
      console.warn("GNews API errors:", res.data.errors);
      return null;
    }

    const articles = res.data.articles ?? [];
    const usable = articles.filter((a) => a.title && (a.description || a.content));
    if (usable.length === 0) return null;

    const pick = usable[Math.floor(Math.random() * usable.length)];
    const title = pick.title ?? "News";
    const body = [pick.description, pick.content].filter(Boolean).join("\n\n").trim();
    return {
      title,
      content: body || pick.description || "No details available.",
    };
  } catch (err) {
    console.warn("fetchGNewsArticle failed:", err);
    return null;
  }
}
