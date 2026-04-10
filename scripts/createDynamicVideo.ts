import { spawn } from "child_process";
import { createRequire } from "node:module";
import fs from "fs";
import path from "path";
import { MAX_REEL_DURATION_SEC } from "../lib/reelLimits";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "ffprobe-static";

const nodeRequire = createRequire(import.meta.url);

ffmpeg.setFfmpegPath(ffmpegPath!);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Pipeline: low-res trim/concat for 512MB-class hosts (Render free tier).
 * Final: 720×1280 export — still sharp on phones, much less RAM than 1080×1920 burns.
 */
const PIPELINE_W = 480;
const PIPELINE_H = 854;
const OUTPUT_W = 720;
const OUTPUT_H = 1280;

/** Scale UI vs original 1080p recipe */
const OUT_SCALE = OUTPUT_W / 1080;
const TICKER_FONT_PX = Math.round(48 * OUT_SCALE);
const TICKER_BOX_Y = Math.round(40 * OUT_SCALE);
const SUBTITLE_MARGIN_V = Math.round(60 * OUT_SCALE);

/** Pass-1 output (video only, captions + ticker burned). Pass-2 muxes voice with `-c:v copy` — no `-filter_complex`. */
const VIDEO_BURNED_FILE = "video_burned.mp4";
/** Styled captions for `subtitles=` filter (styles live in ASS — no `force_style` / commas in argv). */
const CAPTIONS_ASS_FILE = "captions.ass";
/** Ticker as ASS — many static Linux builds (e.g. johnvansickle) have libass but no `drawtext` (no libfreetype). */
const TICKER_ASS_FILE = "ticker.ass";

/** Single-threaded x264 lowers peak RAM on tight hosts. */
const X264_THREADS = "1";

/** Prefer the npm `ffmpeg-static` binary on disk — ignores `FFMPEG_BIN` (Render often points at a slim build without drawtext; we use ASS + libass instead). */
function getFfmpegSpawnExecutable(): string {
  const exeName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  try {
    const pkgJson = nodeRequire.resolve("ffmpeg-static/package.json");
    const candidate = path.join(path.dirname(pkgJson), exeName);
    if (fs.existsSync(candidate)) return candidate;
  } catch {
    /* bundled graph */
  }
  return ffmpegPath!;
}

/** Direct `spawn` argv — avoids fluent-ffmpeg `outputOptions` splitting / ordering bugs with long `-vf` chains. */
function ffmpegSpawn(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(getFfmpegSpawnExecutable(), args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim().slice(-4000)}`));
    });
  });
}

interface SceneSegment {
  start: number; // start time in seconds
  end: number;   // end time in seconds
  text: string;  // narration segment text
  clipPath: string; // path to video for that scene
}

/**
 * Get audio duration in seconds using ffprobe
 */
async function getAudioDuration(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 30);
    });
  });
}

/**
 * Creates a full vertical reel with multiple scene clips + audio + captions
 * Each scene is trimmed to 5 seconds, and the final video matches audio duration
 */
export type SubtitleSize = "s" | "m" | "l";

export async function createDynamicVideo(options: {
  scenes: SceneSegment[];
  voicePath: string;
  captionFile?: string;
  tickerSymbol?: string;
  output?: string;
  subtitleSize?: SubtitleSize;
}) {
  const { scenes, voicePath, captionFile, tickerSymbol, output = "dynamic_reel.mp4", subtitleSize = "s" } = options;

  if (!fs.existsSync(voicePath)) throw new Error(`Missing voice file: ${voicePath}`);

  // Get audio duration to determine how many scenes we need (capped for 30s max reels)
  const rawDuration = await getAudioDuration(voicePath);
  const audioDuration = Math.min(rawDuration, MAX_REEL_DURATION_SEC);
  console.log(`🎵 Audio duration: ${audioDuration.toFixed(2)}s${rawDuration > MAX_REEL_DURATION_SEC ? ` (capped from ${rawDuration.toFixed(2)}s)` : ""}`);

  const sceneDuration = 5; // Each scene is 5 seconds
  const neededScenes = Math.ceil(audioDuration / sceneDuration);
  const availableScenes = scenes.filter(s => fs.existsSync(s.clipPath));
  
  if (availableScenes.length === 0) {
    throw new Error("No scene video files found");
  }

  // Use only the scenes we need, or all available if less
  const scenesToUse = availableScenes.slice(0, neededScenes);
  console.log(`🎬 Using ${scenesToUse.length} scene(s) for ${audioDuration.toFixed(2)}s video`);
  console.log(
    `📐 Pipeline ${PIPELINE_W}×${PIPELINE_H} → export ${OUTPUT_W}×${OUTPUT_H} (low-RAM path for small instances)`
  );

  // 1️⃣ Trim each scene - use trim filter to avoid VFR/timestamp issues in source clips
  const trimmedScenes: string[] = [];

  let totalVideoDuration = 0;
  for (let i = 0; i < scenesToUse.length; i++) {
    const scene = scenesToUse[i];
    const trimmedPath = `scene_trimmed_${i + 1}.mp4`;
    
    // Calculate actual duration for each scene
    // Last scene gets the remainder to match audio duration exactly
    const isLastScene = i === scenesToUse.length - 1;
    let duration: number;
    if (isLastScene) {
      // Last scene: use remaining time to match audio exactly
      duration = Math.max(0.1, audioDuration - totalVideoDuration); // At least 0.1s
    } else {
      duration = sceneDuration;
    }
    totalVideoDuration += duration;

    console.log(`✂️  Trimming scene ${i + 1} to ${duration.toFixed(2)}s... (total so far: ${totalVideoDuration.toFixed(2)}s)`);
    
    await new Promise<void>((resolve, reject) => {
      // Use trim filter for precise cutting - avoids VFR/timestamp issues in source clips
      const scalePad = `scale=${PIPELINE_W}:${PIPELINE_H}:force_original_aspect_ratio=decrease,pad=${PIPELINE_W}:${PIPELINE_H}:(ow-iw)/2:(oh-ih)/2`;
      const trimFilter = `trim=duration=${duration.toFixed(3)},setpts=PTS-STARTPTS,${scalePad}`;
      ffmpeg(scene.clipPath)
        .videoCodec("libx264")
        .outputOptions([
          "-threads",
          X264_THREADS,
          "-an",
          "-pix_fmt yuv420p",
          "-r 30", // Force 30fps - normalizes variable framerate sources
          "-vsync cfr",
          "-preset ultrafast",
          "-crf 23",
          "-g 15", // Keyframe every 0.5s
          "-vf", trimFilter,
        ])
        .save(trimmedPath)
        .on("end", () => {
          // Verify the trimmed file exists and is valid
          if (fs.existsSync(trimmedPath) && fs.statSync(trimmedPath).size > 0) {
            trimmedScenes.push(trimmedPath);
            resolve();
          } else {
            reject(new Error(`Trimmed scene ${i + 1} is invalid or empty`));
          }
        })
        .on("error", (err) => {
          console.error(`❌ Error trimming scene ${i + 1}:`, err);
          reject(err);
        });
    });
  }

  console.log("🎞️  Concatenating scenes (concat demuxer — low memory vs. filter concat)...");
  const combinedPath = "combined_scenes.mp4";
  const concatListPath = "concat_list.txt";
  const listBody = trimmedScenes
    .map((p) => {
      const abs = path.resolve(p).replace(/'/g, "'\\''");
      return `file '${abs}'`;
    })
    .join("\n");
  fs.writeFileSync(concatListPath, listBody);

  // 2️⃣ Concat demuxer + stream copy: one decode pipeline, no parallel decodes (filter concat
  //    holds N decoders and spikes RAM — common OOM on 512MB hosts). Falls back to re-encode
  //    if copy fails (e.g. minor stream mismatch).
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(concatListPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions(["-c", "copy", "-movflags", "+faststart"])
      .save(combinedPath)
      .on("end", () => {
        console.log("✅ Scenes combined (stream copy).");
        if (!fs.existsSync(combinedPath) || fs.statSync(combinedPath).size === 0) {
          reject(new Error("Combined video file is invalid or empty"));
          return;
        }
        resolve();
      })
      .on("error", (err) => {
        console.warn("⚠️  Concat copy failed, re-encoding sequentially:", err?.message ?? err);
        ffmpeg()
          .input(concatListPath)
          .inputOptions(["-f", "concat", "-safe", "0"])
          .outputOptions([
            "-threads",
            X264_THREADS,
            "-c:v",
            "libx264",
            "-an",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "ultrafast",
            "-crf",
            "26",
            "-g",
            "15",
            "-movflags",
            "+faststart",
          ])
          .save(combinedPath)
          .on("end", () => {
            console.log("✅ Scenes combined (re-encode).");
            if (!fs.existsSync(combinedPath) || fs.statSync(combinedPath).size === 0) {
              reject(new Error("Combined video file is invalid or empty"));
              return;
            }
            resolve();
          })
          .on("error", (err2) => {
            console.error("❌ Error concatenating scenes:", err2);
            reject(err2);
          });
      });
  });

  // 3️⃣ Always adjust video to match audio duration exactly
  const combinedDuration = await getAudioDuration(combinedPath);
  console.log(`📹 Combined video duration: ${combinedDuration.toFixed(2)}s`);
  console.log(`🎵 Audio duration: ${audioDuration.toFixed(2)}s`);
  
  // Always ensure video is at least as long as audio (with small buffer)
  // If video is shorter, it will pause/freeze - we need to extend it
  if (combinedDuration < audioDuration - 0.5) {
    const adjustedPath = "combined_scenes_adjusted.mp4";
    
    if (combinedDuration < audioDuration) {
      console.log(`⚠️  Video is shorter than audio (${combinedDuration.toFixed(2)}s < ${audioDuration.toFixed(2)}s). Extending video to match...`);
      // Loop the video to match audio duration exactly - re-encode for compatibility
      await new Promise<void>((resolve, reject) => {
        ffmpeg(combinedPath)
          .inputOptions(["-stream_loop", "-1"]) // Loop indefinitely
          .videoCodec("libx264")
          .audioCodec("aac")
          .outputOptions([
            "-threads",
            X264_THREADS,
            "-t", (audioDuration + 0.5).toFixed(3), // Add small buffer to ensure it's long enough
            "-pix_fmt yuv420p",
            "-preset ultrafast",
            "-g 30", // Keyframe interval
            "-movflags +faststart", // Enable fast start
          ])
          .save(adjustedPath)
          .on("end", async () => {
            if (fs.existsSync(combinedPath)) fs.unlinkSync(combinedPath);
            fs.renameSync(adjustedPath, combinedPath);
            const newDuration = await getAudioDuration(combinedPath);
            console.log(`✅ Video extended to ${newDuration.toFixed(2)}s (target: ${audioDuration.toFixed(2)}s)`);
            resolve();
          })
          .on("error", (err) => {
            console.error("❌ Error extending video:", err);
            reject(err);
          });
      });
    } else if (combinedDuration > audioDuration + 0.5) {
      console.log(`⚠️  Video is longer than audio. Trimming video to match...`);
      // Trim the video to match audio duration exactly - re-encode to avoid issues
      await new Promise<void>((resolve, reject) => {
        ffmpeg(combinedPath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .outputOptions([
            "-threads",
            X264_THREADS,
            "-t", audioDuration.toFixed(3), // Trim to exact audio duration
            "-pix_fmt yuv420p",
            "-preset ultrafast",
            "-g 30", // Keyframe interval
            "-movflags +faststart", // Enable fast start
          ])
          .save(adjustedPath)
          .on("end", () => {
            if (fs.existsSync(combinedPath)) fs.unlinkSync(combinedPath);
            fs.renameSync(adjustedPath, combinedPath);
            console.log("✅ Video trimmed to match audio duration");
            resolve();
          })
          .on("error", (err) => {
            console.error("❌ Error trimming video:", err);
            reject(err);
          });
      });
    }
    
    // Verify the adjusted video duration
    const adjustedDuration = await getAudioDuration(combinedPath);
    console.log(`📹 Adjusted video duration: ${adjustedDuration.toFixed(2)}s`);
  }

  // 4️⃣ Burn video (single-input `-vf` only) then mux voice (`-c:v copy`) — avoids fragile
  //    `-filter_complex` on Linux static ffmpeg (drawtext + subtitles + force_style breaks parsing).
  if (fs.existsSync(output)) {
    fs.unlinkSync(output);
    console.log("🗑️  Removed old output file");
  }

  const videoBurned = path.resolve(VIDEO_BURNED_FILE);
  const captionsAss = path.resolve(CAPTIONS_ASS_FILE);
  const tickerAss = path.resolve(TICKER_ASS_FILE);
  const unlinkIfExists = (p: string) => {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  };

  if (captionFile && fs.existsSync(captionFile)) {
    srtToAss(path.resolve(captionFile), captionsAss, subtitleSize);
  }
  if (tickerSymbol) {
    writeTickerAss(tickerAss, tickerSymbol, audioDuration + 5);
  }

  const vf = buildVfBurnChain({
    captionFile,
    captionsAssPath: captionsAss,
    tickerAssPath: tickerSymbol ? tickerAss : undefined,
  });

  const combinedAbs = path.resolve(combinedPath);
  const voiceAbs = path.resolve(voicePath);
  const outputAbs = path.resolve(output);

  try {
    await ffmpegSpawn([
      "-y",
      "-i",
      combinedAbs,
      "-vf",
      vf,
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "ultrafast",
      "-crf",
      "24",
      "-g",
      "30",
      "-threads",
      X264_THREADS,
      videoBurned,
    ]);

    await ffmpegSpawn([
      "-y",
      "-i",
      videoBurned,
      "-i",
      voiceAbs,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-t",
      audioDuration.toFixed(3),
      "-movflags",
      "+faststart",
      "-threads",
      X264_THREADS,
      outputAbs,
    ]);
  } catch (err) {
    unlinkIfExists(videoBurned);
    unlinkIfExists(captionsAss);
    unlinkIfExists(tickerAss);
    throw err;
  }

  console.log(`🎉 Final reel ready: ${output} (${audioDuration.toFixed(2)}s)`);
  trimmedScenes.forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
  if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
  if (fs.existsSync(combinedPath)) fs.unlinkSync(combinedPath);
  unlinkIfExists(videoBurned);
  unlinkIfExists(captionsAss);
  unlinkIfExists(tickerAss);

  return output;
}

/**
 * Escape text for ffmpeg drawtext filter
 */
function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")  // Escape backslashes first
    .replace(/'/g, "\\'")    // Escape single quotes
    .replace(/:/g, "\\:")    // Escape colons
    .replace(/\[/g, "\\[")   // Escape brackets
    .replace(/\]/g, "\\]")
    .replace(/,/g, "\\,")    // Escape commas
    .replace(/=/g, "\\=")   // Escape equals
    .replace(/%/g, "\\%");  // Escape percent signs
}

const SUBTITLE_FONT_SIZES: Record<SubtitleSize, number> = {
  s: Math.max(8, Math.round(14 * OUT_SCALE)),
  m: Math.max(10, Math.round(20 * OUT_SCALE)),
  l: Math.max(12, Math.round(28 * OUT_SCALE)),
};

function escapePathForVideoFilter(absPath: string): string {
  return absPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function buildVfBurnChain(opts: {
  captionFile?: string;
  captionsAssPath: string;
  /** Second `subtitles=` pass — ticker on top (libass; no `drawtext`). */
  tickerAssPath?: string;
}): string {
  const filters: string[] = [`scale=${OUTPUT_W}:${OUTPUT_H}`];
  if (opts.captionFile && fs.existsSync(opts.captionFile) && fs.existsSync(opts.captionsAssPath)) {
    filters.push(`subtitles='${escapePathForVideoFilter(opts.captionsAssPath)}'`);
  }
  if (opts.tickerAssPath && fs.existsSync(opts.tickerAssPath)) {
    filters.push(`subtitles='${escapePathForVideoFilter(opts.tickerAssPath)}'`);
  }
  return filters.join(",");
}

/** Top banner via ASS — works on builds with libass only (no libfreetype / drawtext). */
function writeTickerAss(assPath: string, symbol: string, durationSec: number): void {
  const end = secondsToAssTime(Math.max(0, durationSec));
  const label = `Ticker: ${symbol}`
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}");
  const y = TICKER_BOX_Y;
  const x = Math.round(OUTPUT_W / 2);
  const header = `[Script Info]
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: ${OUTPUT_W}
PlayResY: ${OUTPUT_H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Ticker,Arial,${TICKER_FONT_PX},&H00FFFFFF,&H000000FF,&H00000000,&HC0000000,1,0,0,0,100,100,0,0,3,3,0,8,10,10,${y},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,${end},Ticker,,,0,0,0,,{\\an8\\pos(${x},${y})\\b1}${label}
`;
  fs.writeFileSync(assPath, header, "utf8");
}

function parseSrtTimestamp(ts: string): number {
  const m = ts.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!m) return 0;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  const ms = parseInt(m[4].padEnd(3, "0").slice(0, 3), 10);
  return h * 3600 + min * 60 + sec + ms / 1000;
}

function secondsToAssTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.min(99, Math.floor((sec % 1) * 100 + 1e-6));
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** SRT → ASS so libass reads font size / margins from the file (no `force_style` in ffmpeg args). */
function srtToAss(srtPath: string, assPath: string, subtitleSize: SubtitleSize): void {
  const raw = fs.readFileSync(srtPath, "utf8");
  const fontSize = SUBTITLE_FONT_SIZES[subtitleSize];
  const marginV = SUBTITLE_MARGIN_V;
  const header = `[Script Info]
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: ${OUTPUT_W}
PlayResY: ${OUTPUT_H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,3,1,0,2,10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const blocks = raw.replace(/\r\n/g, "\n").trim().split(/\n\n+/);
  const dialogues: string[] = [];
  for (const block of blocks) {
    const parts = block.trim().split("\n");
    if (parts.length < 2) continue;
    let ti = 0;
    if (/^\d+$/.test(parts[0].trim())) ti = 1;
    if (ti >= parts.length) continue;
    const timeLine = parts[ti];
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{1,3})/
    );
    if (!timeMatch) continue;
    const start = secondsToAssTime(parseSrtTimestamp(timeMatch[1]));
    const end = secondsToAssTime(parseSrtTimestamp(timeMatch[2]));
    const text = parts
      .slice(ti + 1)
      .join("\\N")
      .replace(/\\/g, "\\\\")
      .replace(/{/g, "\\{")
      .replace(/}/g, "\\}");
    dialogues.push(`Dialogue: 0,${start},${end},Default,,,0,0,0,,${text}`);
  }
  fs.writeFileSync(assPath, header + dialogues.join("\n") + "\n", "utf8");
}
