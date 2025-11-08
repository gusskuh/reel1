import { OpenAI } from "openai";
import { fetchBackgroundVideo } from "./fetchBackgroundVideo";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSceneVideos(script: string) {
  const prompt = `
Split this narration into short visual scenes (max 5 seconds each).
For each scene, return JSON with "text" (narration snippet) and "keywords" (visual topics).
Example: [{"text": "NVIDIA stock rose", "keywords": ["NVIDIA logo", "tech stocks"]}]
Narration:
${script}
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
  
  const scenes = parsed.scenes || [];
  
  if (scenes.length === 0) {
    throw new Error("No scenes generated from script");
  }

  // Fetch video clips for each scene
  for (const [i, scene] of scenes.entries()) {
    const keyword = scene.keywords?.[0] || scene.keyword || "financial news";
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
