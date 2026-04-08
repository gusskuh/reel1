import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "ffprobe-static";
import { MAX_REEL_DURATION_SEC } from "./reelLimits";

ffmpeg.setFfmpegPath(ffmpegPath!);
ffmpeg.setFfprobePath(ffprobePath);

function probeDurationSec(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

/**
 * If audio is longer than maxSec, rewrite file in place with stream copy trim (same basename).
 * Call before captions + video so timings stay aligned.
 */
export async function capAudioDurationInPlace(
  audioPath: string,
  maxSec: number = MAX_REEL_DURATION_SEC
): Promise<void> {
  const dur = await probeDurationSec(audioPath);
  if (dur <= maxSec + 0.05) return;

  const dir = path.dirname(audioPath);
  const tmp = path.join(dir, `.voice_cap_${Date.now()}.mp3`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(audioPath)
      .outputOptions(["-t", maxSec.toFixed(3), "-c", "copy"])
      .save(tmp)
      .on("end", () => resolve())
      .on("error", reject);
  });

  fs.unlinkSync(audioPath);
  fs.renameSync(tmp, audioPath);
  console.log(`✂️  Capped voice to ${maxSec}s (was ${dur.toFixed(2)}s)`);
}
