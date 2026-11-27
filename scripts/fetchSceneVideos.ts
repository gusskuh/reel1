import { OpenAI } from "openai";
import { fetchBackgroundVideo } from "./fetchBackgroundVideo";
import { MAX_REEL_SCENES } from "../lib/reelLimits";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Broader fallbacks so non-finance niches don't all land on the same market clips. */
const DEFAULT_FALLBACK_QUERIES = [
  "city street",
  "office work",
  "nature landscape",
  "technology",
  "people walking",
  "sports action",
  "business meeting",
  "news studio",
];

function uniqueQueries(...groups: (string | string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (q: string) => {
    const t = q.trim();
    if (!t || seen.has(t.toLowerCase())) return;
    seen.add(t.toLowerCase());
    out.push(t);
  };
  for (const g of groups) {
    if (!g) continue;
    if (Array.isArray(g)) g.forEach((x) => push(String(x)));
    else push(String(g));
  }
  return out;
}

/** Build search strings: full phrase first (up to 5 terms), then each term, then global fallbacks. */
function stockQueryCandidates(sceneKeywords: string[], defaultKeyword: string): string[] {
  const cleaned = sceneKeywords.map((k) => k.trim()).filter(Boolean);
  const base = cleaned.length ? cleaned : [defaultKeyword];
  const primary = base.slice(0, 5).join(" ");

  return uniqueQueries(primary, base, DEFAULT_FALLBACK_QUERIES);
}

export async function generateSceneVideos(script: string, defaultKeyword = "motivation") {
  const prompt = `
Split this narration into short visual scenes (max 5 seconds each).
Use at most ${MAX_REEL_SCENES} scenes total (~30 seconds of video).
For each scene, return JSON with "text" (narration snippet) and "keywords" (3 to 5 short stock-footage search terms).
Use 3–5 separate tokens or short phrases (e.g. "startup office", "laptop", "team meeting") that together describe one stock-footage search idea.
Match script tone (news, business, tech, sports, etc.). Prefer visually distinct scenes so clips don't look identical. All lowercase where possible, no hashtags.
Narration:
${script}

Return JSON in format: {"scenes": [{"text": "...", "keywords": ["term1", "term2", "term3", "term4", "term5"]}, ...]}
Each scene must include at least 3 keywords in "keywords" (up to 5).
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

  // Same reel: never reuse the same stock clip id across scenes
  const usedClipIds = new Set<string>();

  for (const [i, scene] of scenes.entries()) {
    const raw =
      Array.isArray(scene.keywords) && scene.keywords.length
        ? scene.keywords
        : scene.keyword
          ? [String(scene.keyword)]
          : [];
    const candidates = stockQueryCandidates(raw, defaultKeyword);
    let saved: string | null = null;
    for (const query of candidates) {
      console.log(`🎥 Scene ${i + 1} — trying stock: "${query}"`);
      try {
        saved = await fetchBackgroundVideo(query, `scene_${i + 1}.mp4`, {
          excludeIds: usedClipIds,
        });
        if (saved) break;
      } catch (error) {
        console.warn(`⚠️  Scene ${i + 1} query failed:`, query, error);
      }
    }
    if (!saved) {
      console.warn(`⚠️  No stock clip for scene ${i + 1} after ${candidates.length} queries`);
    }
  }

  return scenes;
}
