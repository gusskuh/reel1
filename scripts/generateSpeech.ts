// generateSpeech.ts
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate an MP3 speech file from text using OpenAI's TTS model.
 * @param text - The script you want spoken.
 * @param filename - Optional output filename (defaults to 'voice.mp3').
 * @param voice - Optional voice style ("alloy", "verse", "charlie", etc.)
 */
export async function generateSpeech(
  text: string,
  filename = "voice.mp3",
  voice: "alloy" | "verse" | "charlie" | "cove" | "ash" | "coral" = "alloy"
): Promise<string> {
  const outputPath = path.resolve(filename);

  console.log("🎤 Generating speech...");

  // Create the speech file
  const response = await client.audio.speech.create({
    model: "tts-1", // lightweight, high-quality TTS model
    voice,
    input: text,
    response_format: "mp3",
  });

  // Convert ArrayBuffer → Buffer → file
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Speech saved: ${outputPath}`);
  return outputPath;
}
