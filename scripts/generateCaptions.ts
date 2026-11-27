import fs from "fs";
import path from "path";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import { path as ffprobePath } from "ffprobe-static";
import dotenv from "dotenv";
dotenv.config();

// Configure ffprobe path
ffmpeg.setFfprobePath(ffprobePath);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CaptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface CaptionWord {
  word: string;
  start: number;
  end: number;
}

/**
 * Generate timestamped captions (SRT) + optional word timings for TikTok-style ASS.
 */
export async function generateCaptions(
  audioPath: string,
  outputFile = "captions.srt"
): Promise<string> {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  console.log("🎧 Transcribing audio for captions...");

  let response: any;
  let segments: { start: number; end: number; text: string }[] | undefined;
  let words: CaptionWord[] | undefined;

  try {
    response = await client.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
    } as Parameters<typeof client.audio.transcriptions.create>[0]);
    segments = response.segments;
    words = normalizeWhisperWords(response.words);
  } catch (error: any) {
    if (error?.code === "unsupported_value" || error?.message?.includes("verbose_json")) {
      console.log("⚠️  verbose_json not supported, trying json format...");
      response = await client.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
        response_format: "json",
      });
      segments = undefined;
      words = undefined;
    } else if (error?.message?.includes("timestamp_granularities") || error?.code === "invalid_request_error") {
      console.log("⚠️  Word timestamps unavailable, falling back to segments…");
      response = await client.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
        response_format: "verbose_json",
      });
      segments = response.segments;
      words = undefined;
    } else {
      throw error;
    }
  }

  if (!segments?.length) {
    const text = response.text || "...";
    console.warn("⚠️ No segments returned — creating single caption from text.");

    const duration = await getAudioDuration(audioPath);
    fs.writeFileSync(
      outputFile,
      toSRT([{ start: 0, end: duration, text: text }])
    );
    writeWordsSidecar(outputFile, undefined);
    return path.resolve(outputFile);
  }

  const srt = toSRT(segments);
  fs.writeFileSync(outputFile, srt);
  writeWordsSidecar(outputFile, words);

  console.log(
    `✅ Captions saved: ${outputFile}${words?.length ? ` (+${words.length} word timings)` : ""}`
  );
  return path.resolve(outputFile);
}

function normalizeWhisperWords(
  raw: { word?: string; start?: number; end?: number }[] | undefined
): CaptionWord[] | undefined {
  if (!raw?.length) return undefined;
  const out: CaptionWord[] = [];
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    const text = (w.word || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    let start = Number(w.start);
    let end = Number(w.end);
    if (!Number.isFinite(start)) start = out.length ? out[out.length - 1].end : 0;
    if (!Number.isFinite(end) || end <= start) {
      const next = raw[i + 1];
      const nextStart = Number(next?.start);
      end = Number.isFinite(nextStart) && nextStart > start ? nextStart : start + 0.28;
    }
    out.push({ word: text, start, end });
  }
  return out.length ? out : undefined;
}

function writeWordsSidecar(srtPath: string, words: CaptionWord[] | undefined): void {
  const wordsPath = srtPath.replace(/\.srt$/i, ".words.json");
  if (!words?.length) {
    if (fs.existsSync(wordsPath)) fs.unlinkSync(wordsPath);
    return;
  }
  fs.writeFileSync(wordsPath, JSON.stringify({ words }, null, 2), "utf8");
}

/**
 * Convert Whisper-style timestamped segments to SRT format
 */
function toSRT(segments: CaptionSegment[]): string {
  return segments
    .map((s, i) => {
      const start = formatTimestamp(s.start);
      const end = formatTimestamp(s.end);
      return `${i + 1}\n${start} --> ${end}\n${s.text.trim()}\n`;
    })
    .join("\n");
}

/**
 * Convert seconds → SRT timecode (HH:MM:SS,mmm)
 */
function formatTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((sec % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  const ms = Math.floor((sec % 1) * 1000)
    .toString()
    .padStart(3, "0");
  return `${h}:${m}:${s},${ms}`;
}

/**
 * Get audio duration in seconds using ffprobe
 */
async function getAudioDuration(file: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {
        console.warn("⚠️  Could not get audio duration, using default 30s");
        resolve(30);
        return;
      }
      resolve(metadata.format.duration || 30);
    });
  });
}
