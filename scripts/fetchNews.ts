import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

interface NewsItem {
  title: string;
  date: string;
  content: string;
}

interface ApiNewsItem {
  title: string;
  text?: string;
  content?: string;
  description?: string;
  publishedDate?: string;
  date?: string;
  site: string;
}

export async function fetchMarketNews(): Promise<NewsItem | null> {
  try {
    const url = `https://financialmodelingprep.com/stable/fmp-articles?page=0&limit=20&apikey=${process.env.FMP_API_KEY}`;

    const res = await axios.get<ApiNewsItem[] | { "Error Message": string }>(url);
    
    // Check if the response is an error message
    if (res.data && typeof res.data === 'object' && 'Error Message' in res.data) {
      return null;
    }

    const newsItems = res.data as ApiNewsItem[];

    if (Array.isArray(newsItems) && newsItems.length > 0) {
      // Randomly select one article from the 20 fetched
      const randomIndex = Math.floor(Math.random() * newsItems.length);
      const selectedItem = newsItems[randomIndex];
      
      // Get content from any available field
      const content = selectedItem.text || selectedItem.content || selectedItem.description || 
                     (selectedItem as any).body || (selectedItem as any).article || 'No content available';
      
      return {
        title: selectedItem.title,
        date: selectedItem.publishedDate || selectedItem.date || 'N/A',
        content: content,
      };
}
  } catch (error) {
    // Silently skip - we'll show a summary message at the end
    // This is expected if the API requires a subscription
  }

  return null;
}
