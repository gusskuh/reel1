// createVideo.ts
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { path as ffprobePath } from "ffprobe-static";

// Configure ffprobe path
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Create a short vertical reel video with:
 *  - a background image or stock clip
 *  - your generated voiceover
 *  - optional captions (simple static overlay)
 */
export async function createReelVideo(options: {
  voicePath: string;         // e.g. "voice.mp3"
  backgroundPath?: string;   // e.g. "bg.jpg" or "bg.mp4"
  captions?: string;         // path to SRT file or text for static caption
  output?: string;           // output video name
}) {
  const {
    voicePath,
    backgroundPath = "bg.jpg",
    captions = "",
    output = "news_reel.mp4",
  } = options;

  if (!fs.existsSync(voicePath))
    throw new Error(`Voice file not found: ${voicePath}`);
  if (!fs.existsSync(backgroundPath))
    throw new Error(`Background not found: ${backgroundPath}`);

  console.log("🎞️  Creating video reel...");

  const duration = await getAudioDuration(voicePath);
  const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(backgroundPath);
  
  // Check if captions is an SRT file path or plain text
  const isSRTFile = captions && (captions.endsWith('.srt') || fs.existsSync(captions));
  
  // Build video filter
  let videoFilter = "scale=1080:1920";
  
  if (isSRTFile && fs.existsSync(captions)) {
    // Use subtitles filter for SRT file
    const escapedSRTPath = captions.replace(/:/g, "\\:").replace(/'/g, "\\'");
    videoFilter += `,subtitles='${escapedSRTPath}':force_style='FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=50'`;
  } else if (captions) {
    // Use drawtext for static text caption
    videoFilter += `,drawtext=text='${escapeText(captions)}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-200:box=1:boxcolor=0x80000000`;
  }

  return new Promise<string>((resolve, reject) => {
    const cmd = ffmpeg();

    // Handle image vs video differently
    if (isImage) {
      // For images: loop the image for the duration of the audio
      cmd.input(backgroundPath)
        .inputOptions(["-loop", "1", "-t", duration.toString()])
        .addInput(voicePath)
        .outputOptions([
          "-c:v", "libx264",
          "-c:a", "aac",
          "-pix_fmt", "yuv420p",
          "-shortest",
          "-vf", videoFilter,
        ]);
    } else {
      // For videos: loop if needed, or trim to audio length
      cmd.input(backgroundPath)
        .inputOptions(["-stream_loop", "-1"]) // Loop video indefinitely
        .addInput(voicePath)
        .outputOptions([
          "-c:v", "libx264",
          "-c:a", "aac",
          "-pix_fmt", "yuv420p",
          "-shortest", // Stop when shortest input ends (audio)
          "-vf", videoFilter,
        ]);
    }

    cmd.save(output)
      .on("end", () => {
        console.log(`✅ Video saved: ${output}`);
        resolve(output);
      })
      .on("error", (err) => reject(err));
  });
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

function escapeText(text: string): string {
  return text.replace(/:/g, "\\:").replace(/'/g, "\\'");
}
