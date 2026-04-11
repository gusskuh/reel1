import { OpenAI } from "openai";
import { fetchBackgroundVideo } from "./fetchBackgroundVideo";
import { MAX_REEL_SCENES } from "../lib/reelLimits";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSceneVideos(script: string, defaultKeyword = "motivation") {
  const prompt = `
Split this narration into short visual scenes (max 5 seconds each).
Use at most ${MAX_REEL_SCENES} scenes total (~30 seconds of video).
For each scene, return JSON with "text" (narration snippet) and "keywords" (visual topics for stock footage).
Use Pexels-friendly keywords that match the script tone (news, business, tech, sports, etc.).
Narration:
${script}

Return JSON in format: {"scenes": [{"text": "...", "keywords": ["keyword1", "keyword2"]}, ...]}
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt + "\n\nReturn JSON in format: {\"scenes\": [...]}" }],
  });

  const content = response.choices[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error("❌ Failed to parse scenes JSON:", error);
    throw new Error("Invalid JSON response from OpenAI");
  }
  
  const scenes = (parsed.scenes || []).slice(0, MAX_REEL_SCENES);

  if (scenes.length === 0) {
    throw new Error("No scenes generated from script");
  }

  // Fetch video clips for each scene
  for (const [i, scene] of scenes.entries()) {
    const keyword = scene.keywords?.[0] || scene.keyword || defaultKeyword;
    console.log(`🎥 Fetching clip for scene ${i + 1}: ${keyword}`);
    try {
      await fetchBackgroundVideo(keyword, `scene_${i + 1}.mp4`);
    } catch (error) {
      console.warn(`⚠️  Failed to fetch video for scene ${i + 1}:`, error);
      // Continue with other scenes even if one fails
    }
  }

  return scenes;
}
