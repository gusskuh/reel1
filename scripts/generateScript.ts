import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ScriptNiche =
  | "financial"
  | "inspirational"
  | "health"
  | "news"
  | "fitness"
  | "finance"
  | "tech"
  | "food"
  | "relationships";

export async function generateReelScript(
  input: { title: string; content: string },
  niche: ScriptNiche = "financial"
): Promise<string> {
  const prompt =
    niche === "inspirational"
      ? `
You are an inspirational content creator making short social media reels.

Polish this motivational script for a 30-second video. Keep the same message but:
- Make it punchy and quotable
- Ensure a strong hook and satisfying close
- Natural for spoken delivery

Content:
${input.content}
`
      : niche === "health"
      ? `
You are a health and wellness content creator making short social media reels.

Polish this health script for a 30-second video. Keep the same message but:
- Make it clear and trustworthy
- Ensure a strong hook and actionable close
- Natural for spoken delivery

Content:
${input.content}
`
      : niche === "news"
      ? `
You are a world news anchor making short social media reels.

Polish this news script for a 30-second video. Keep the same message but:
- Clear, informative, and neutral
- Ensure a strong hook and satisfying close
- Natural for spoken delivery

Content:
${input.content}
`
      : niche === "fitness"
      ? `
You are a fitness creator making short social media reels.

Polish this fitness script for a 30-second video. Keep the same message but:
- Energetic and motivating
- Ensure a strong hook and actionable close
- Natural for spoken delivery

Content:
${input.content}
`
      : niche === "finance"
      ? `
You are a personal finance creator making short social media reels.

Polish this money tips script for a 30-second video. Keep the same message but:
- Clear and practical
- Ensure a strong hook and actionable close
- Natural for spoken delivery

Content:
${input.content}
`
      : niche === "tech"
      ? `
You are a tech and AI creator making short social media reels.

Polish this tech script for a 30-second video. Keep the same message but:
- Clear and helpful
- Ensure a strong hook and satisfying close
- Natural for spoken delivery

Content:
${input.content}
`
      : niche === "food"
      ? `
You are a food and recipe creator making short social media reels.

Polish this food script for a 30-second video. Keep the same message but:
- Appetizing and friendly
- Ensure a strong hook and satisfying close
- Natural for spoken delivery

Content:
${input.content}
`
      : niche === "relationships"
      ? `
You are a relationship advice creator making short social media reels.

Polish this dating/relationships script for a 30-second video. Keep the same message but:
- Warm and relatable
- Ensure a strong hook and satisfying close
- Natural for spoken delivery

Content:
${input.content}
`
      : `
You are a financial content creator making short social media reels.

Summarize this news article in a conversational and energetic tone that would fit a 30-second video.
Make it clear, engaging, and suitable for a general audience — not too technical.

Include a one-line hook at the start, then the main point, and a closing line that feels complete.

News title: ${input.title}

Content:
${input.content}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script || script === "No script generated.") {
    return "No script generated.";
  }

  if (niche === "financial") {
    return `${script}\n\nFor more information visit us at value z A i dot com`;
  }
  return script;
}
