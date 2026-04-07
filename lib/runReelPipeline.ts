/**
 * Run the reel generation pipeline (news → script → speech → scenes → captions → video).
 * No uploads. Runs in workDir to avoid file collisions between concurrent jobs.
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { getPipelineTmpRoot } from "./dataRoot";
import { getContentByNiche, type Niche } from "./contentByNiche";
import { generateReelScript } from "../scripts/generateScript";
import { generateSpeech } from "../scripts/generateSpeech";
import { generateSceneVideos } from "../scripts/fetchSceneVideos";
import { generateCaptions } from "../scripts/generateCaptions";
import { createDynamicVideo } from "../scripts/createDynamicVideo";

export interface RunReelPipelineOptions {
  workDir?: string;
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  subtitleSize?: "s" | "m" | "l";
  niche?: Niche;
}

export interface RunReelPipelineResult {
  videoPath: string;
  workDir: string;
}

export async function runReelPipeline(options?: RunReelPipelineOptions | string): Promise<RunReelPipelineResult> {
  const opts = typeof options === "string" ? { workDir: options } : options ?? {};
  const { workDir, voice = "alloy", subtitleSize = "m", niche = "financial" } = opts;
  const resolvedWorkDir = workDir ?? path.join(getPipelineTmpRoot(), randomUUID());
  if (!fs.existsSync(resolvedWorkDir)) {
    fs.mkdirSync(resolvedWorkDir, { recursive: true });
  }

  const originalCwd = process.cwd();
  try {
    process.chdir(resolvedWorkDir);

    const content = await getContentByNiche(niche);

    const script = await generateReelScript(
      { title: content.title, content: content.content },
      niche
    );

    const voicePath = await generateSpeech(script, "voice.mp3", voice);

    const defaultKeyword =
      niche === "inspirational"
        ? "motivation"
        : niche === "health"
        ? "health wellness"
        : niche === "news"
        ? "world news"
        : niche === "fitness"
        ? "fitness workout"
        : niche === "finance"
        ? "money savings"
        : niche === "tech"
        ? "technology computer"
        : niche === "food"
        ? "cooking food"
        : niche === "relationships"
        ? "couple relationship"
        : "financial news";
    const scenes = await generateSceneVideos(script, defaultKeyword);
    if (!scenes || scenes.length === 0) {
      throw new Error("No scenes generated");
    }

    const sceneSegments = scenes.map((s: { text?: string; keywords?: string[] }, i: number) => ({
      start: i * 5,
      end: (i + 1) * 5,
      text: s.text || "",
      clipPath: `scene_${i + 1}.mp4`,
    }));

    const captionsPath = await generateCaptions(voicePath, "captions.srt");

    const videoPath = await createDynamicVideo({
      scenes: sceneSegments,
      voicePath,
      captionFile: captionsPath,
      tickerSymbol: content.tickerSymbol,
      output: "dynamic_reel.mp4",
      subtitleSize,
    });

    return { videoPath: path.resolve(resolvedWorkDir, videoPath), workDir: resolvedWorkDir };
  } catch (err) {
    try {
      if (fs.existsSync(resolvedWorkDir)) {
        fs.rmSync(resolvedWorkDir, { recursive: true, force: true });
      }
    } catch {
      /* ignore cleanup errors */
    }
    throw err;
  } finally {
    process.chdir(originalCwd);
  }
}
