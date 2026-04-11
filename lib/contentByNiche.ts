/**
 * Fetch content for a reel niche: Stocks News (FMP) or GNews top headlines by category.
 */
import path from "path";
import { fetchMarketNews } from "../scripts/fetchNews";
import { extractTickerFromNews } from "./extractTickerSymbol";
import { fetchGNewsArticle } from "./fetchGNews";
import type { Niche, GNewsCategory } from "./nicheConfig";
import { isGNewsCategory } from "./nicheConfig";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export type { Niche, GNewsCategory } from "./nicheConfig";
export { NICHE_OPTIONS, ALL_NICHES, isValidNiche, isGNewsCategory } from "./nicheConfig";

export interface ContentResult {
  title: string;
  content: string;
  tickerSymbol?: string;
}

export async function getContentByNiche(niche: Niche): Promise<ContentResult> {
  if (isGNewsCategory(niche)) {
    const article = await fetchGNewsArticle(niche);
    if (!article) {
      throw new Error(
        "No headlines available from GNews. Check G_NEWS_IO in .env and your plan limits."
      );
    }
    return {
      title: article.title,
      content: article.content,
    };
  }

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
