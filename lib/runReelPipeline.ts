/**
 * Run the reel generation pipeline (news → script → speech → scenes → captions → video).
 * No uploads. Runs in workDir to avoid file collisions between concurrent jobs.
 *
 * Pipeline steps rely on `process.chdir(workDir)` and relative paths; `chdir` is **process-global**,
 * so overlapping API requests would corrupt cwd for each other. We serialize runs on this queue.
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { getPipelineTmpRoot } from "./dataRoot";
import { getContentByNiche } from "./contentByNiche";
import type { Niche } from "./nicheConfig";
import { SCENE_KEYWORDS } from "./nicheConfig";
import { generateReelScript } from "../scripts/generateScript";
import { generateSpeech } from "../scripts/generateSpeech";
import { generateSceneVideos } from "../scripts/fetchSceneVideos";
import { generateCaptions } from "../scripts/generateCaptions";
import { createDynamicVideo } from "../scripts/createDynamicVideo";
import { capAudioDurationInPlace } from "./capAudioDuration";

export type { Niche } from "./nicheConfig";

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

/** One in-flight pipeline at a time (see module comment on `process.chdir`). */
let pipelineTail: Promise<unknown> = Promise.resolve();

export async function runReelPipeline(options?: RunReelPipelineOptions | string): Promise<RunReelPipelineResult> {
  const opts = typeof options === "string" ? { workDir: options } : options ?? {};
  const { workDir, voice = "alloy", subtitleSize = "m", niche = "financial" } = opts;
  const resolvedWorkDir = workDir ?? path.join(getPipelineTmpRoot(), randomUUID());
  if (!fs.existsSync(resolvedWorkDir)) {
    fs.mkdirSync(resolvedWorkDir, { recursive: true });
  }

  const run = async (): Promise<RunReelPipelineResult> => {
    const originalCwd = process.cwd();
    try {
      process.chdir(resolvedWorkDir);

      const content = await getContentByNiche(niche);

      const script = await generateReelScript(
        { title: content.title, content: content.content },
        niche
      );

      const voicePath = await generateSpeech(script, "voice.mp3", voice);
      await capAudioDurationInPlace(voicePath);

      const defaultKeyword = SCENE_KEYWORDS[niche];
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
  };

  const next = pipelineTail.then(run);
  pipelineTail = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}
