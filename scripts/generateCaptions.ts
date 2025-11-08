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

/**
 * Generate timestamped captions (SRT) using OpenAI Whisper transcription
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

  try {
    // Try whisper-1 with verbose_json first (supports timestamps)
    response = await client.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
    });
    segments = response.segments;
  } catch (error: any) {
    // Fallback: if verbose_json fails, try with json format
    if (error?.code === "unsupported_value" || error?.message?.includes("verbose_json")) {
      console.log("⚠️  verbose_json not supported, trying json format...");
      response = await client.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
        response_format: "json",
      });
      // json format doesn't include segments, so we'll create a single caption
      segments = undefined;
    } else {
      throw error;
    }
  }

  if (!segments?.length) {
    // Fallback: if no segments, create a single caption from the text
    const text = response.text || "...";
    console.warn("⚠️ No segments returned — creating single caption from text.");
    
    // Get audio duration using ffprobe
    const duration = await getAudioDuration(audioPath);
    fs.writeFileSync(
      outputFile,
      toSRT([{ start: 0, end: duration, text: text }])
    );
    return path.resolve(outputFile);
  }

  const srt = toSRT(segments);
  fs.writeFileSync(outputFile, srt);

  console.log(`✅ Captions saved: ${outputFile}`);
  return path.resolve(outputFile);
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
  return new Promise((resolve, reject) => {
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

// Remove standalone execution - this is called from index.ts
