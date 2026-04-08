import fs from "fs";
import path from "path";
import { MAX_REEL_DURATION_SEC } from "../lib/reelLimits";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "ffprobe-static";
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

/** Single-threaded x264 lowers peak RAM on tight hosts. */
const X264_THREADS = "1";

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

  // 4️⃣ Add the audio + captions, ensuring exact duration match
  // Remove old output file if it exists
  if (fs.existsSync(output)) {
    fs.unlinkSync(output);
    console.log("🗑️  Removed old output file");
  }

  return new Promise<string>((resolve, reject) => {
    const cmd = ffmpeg();
    cmd.input(combinedPath)
      .addInput(voicePath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-threads",
        X264_THREADS,
        "-pix_fmt yuv420p",
        "-preset ultrafast",
        "-crf 24",
        "-g 30", // Keyframe interval for better seeking
        "-movflags +faststart", // Enable fast start
        "-t", audioDuration.toFixed(3), // Force exact audio duration
        "-filter_complex",
        buildFilterComplex(captionFile, tickerSymbol, subtitleSize),
        "-map [v]", // Map the filtered video
        "-map 1:a", // Map audio from second input (voice)
      ])
      .save(output)
      .on("end", () => {
        console.log(`🎉 Final reel ready: ${output} (${audioDuration.toFixed(2)}s)`);
        // Clean up temporary files
        trimmedScenes.forEach(f => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });
        if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
        if (fs.existsSync(combinedPath)) fs.unlinkSync(combinedPath);
        // Clean up ticker text file if it exists
        const tickerTextFile = path.resolve("ticker_text.txt");
        if (fs.existsSync(tickerTextFile)) fs.unlinkSync(tickerTextFile);
        resolve(output);
      })
      .on("error", (err) => {
        console.error("❌ Video generation failed:", err);
        reject(err);
      });
  });
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

/**
 * Escape characters that break -filter_complex parsing:
 * - `,` splits filters; `\@` is file-include in some contexts; `&` can confuse option parsing in ASS styles.
 */
function escapeFilterGraphOptionValue(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/@/g, "\\@")
    .replace(/&/g, "\\&")
    .replace(/,/g, "\\,");
}

function buildFilterComplex(captionFile?: string, tickerSymbol?: string, subtitleSize: SubtitleSize = "m"): string {
  let filterChain = `[0:v]scale=${OUTPUT_W}:${OUTPUT_H}`;
  
  // Add ticker badge at the top if provided
  // Use textfile approach to avoid escaping issues
  if (tickerSymbol) {
    const tickerTextFile = path.resolve("ticker_text.txt");
    const tickerText = `Ticker: ${tickerSymbol}`;
    fs.writeFileSync(tickerTextFile, tickerText);
    const escapedTickerFile = tickerTextFile.replace(/:/g, "\\:").replace(/'/g, "\\'");
    // @ in boxcolor=black@0.8 must be \@ or ffmpeg treats @ as file-include and the graph breaks ("Filter not found").
    filterChain += `,drawtext=textfile='${escapedTickerFile}':fontcolor=white:fontsize=${TICKER_FONT_PX}:x=(w-text_w)/2:y=${TICKER_BOX_Y}:box=1:boxcolor=black\@0.8:boxborderw=10`;
  }
  
  // Add subtitles if available
  if (captionFile && fs.existsSync(captionFile)) {
    const fontSize = SUBTITLE_FONT_SIZES[subtitleSize];
    const escapedPath = path.resolve(captionFile).replace(/:/g, "\\:").replace(/'/g, "\\'");
    const forceStyleRaw = `FontSize=${fontSize},PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=3,Outline=1,Alignment=2,MarginV=${SUBTITLE_MARGIN_V}`;
    const forceStyle = escapeFilterGraphOptionValue(forceStyleRaw);
    filterChain += `,subtitles='${escapedPath}':force_style='${forceStyle}'`;
  }
  
  filterChain += "[v]";
  return filterChain;
}
