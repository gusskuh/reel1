import OpenAI from "openai";
import dotenv from "dotenv";
import { MAX_REEL_DURATION_SEC } from "../lib/reelLimits";
import type { Niche } from "../lib/nicheConfig";
import { nicheDisplayLabel } from "../lib/nicheConfig";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ScriptNiche = Niche;

/** Appended to every niche prompt so TTS + video stay within the cap. */
const LENGTH_RULE = `\n\nSpoken length: at most ${MAX_REEL_DURATION_SEC} seconds (~75 words). Do not exceed.`;

export async function generateReelScript(
  input: { title: string; content: string },
  niche: ScriptNiche = "financial"
): Promise<string> {
  const label = nicheDisplayLabel(niche);

  const prompt =
    niche === "financial"
      ? `
You are a financial content creator making short social media reels.

Summarize this news article in a conversational and energetic tone that would fit a 30-second video.
Make it clear, engaging, and suitable for a general audience — not too technical.

Include a one-line hook at the start, then the main point, and a closing line that feels complete.

News title: ${input.title}

Content:
${input.content}
`
      : `
You are a news creator making short social media reels for a general audience.

Summarize this ${label} story in a conversational, energetic tone for a 30-second video.
Stay accurate to the article — clear and engaging, not sensationalized.

Include a one-line hook at the start, then the main point, and a closing line that feels complete.

News title: ${input.title}

Content:
${input.content}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt + LENGTH_RULE }],
    max_tokens: 240,
  });

  const script = completion.choices[0]?.message?.content?.trim();
  if (!script || script === "No script generated.") {
    return "No script generated.";
  }

  return script;
}
