import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateReelScript(news: { title: string; content: string }) {
  const prompt = `
You are a financial content creator making short social media reels.

Summarize this news article in a conversational and energetic tone that would fit a 30-second video.
Make it clear, engaging, and suitable for a general audience — not too technical.

Include a one-line hook at the start, then the main point, and a closing line that feels complete.

News title: ${news.title}

Content:
${news.content}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini", // Using gpt-4o-mini for cost efficiency
    messages: [{ role: "user", content: prompt }],
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script || script === "No script generated.") {
    return "No script generated.";
  }
  
  // Append call-to-action at the end (spelled out for correct pronunciation)
  return `${script}\n\nFor more information visit us at value z A i dot com`;
}
