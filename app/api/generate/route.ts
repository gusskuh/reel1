import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createJob, deleteJob, setJob } from "@/lib/jobs";
import { runReelPipeline } from "@/lib/runReelPipeline";
import { checkRateLimit, getRateLimitStatus } from "@/lib/rateLimit";
import { isJobIdString, removeReelUploadFile } from "@/lib/reelCleanup";
import { getUploadsDir } from "@/lib/dataRoot";
import { isValidNiche, type Niche } from "@/lib/nicheConfig";

export const runtime = "nodejs";
/** Vercel / Render: allow long pipeline (requires Pro on Vercel for >60s). */
export const maxDuration = 300;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const { ok, error } = checkRateLimit(ip);
  if (!ok) {
    return NextResponse.json({ error: error || "Rate limit exceeded" }, { status: 429 });
  }

  let voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy";
  let subtitleSize: "s" | "m" | "l" = "m";
  let niche: Niche = "financial";
  let previousJobId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.voice && ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(body.voice)) {
      voice = body.voice;
    }
    if (body.subtitleSize && ["s", "m", "l"].includes(body.subtitleSize)) {
      subtitleSize = body.subtitleSize;
    }
    if (body.niche && typeof body.niche === "string" && isValidNiche(body.niche)) {
      niche = body.niche;
    }
    if (typeof body.previousJobId === "string" && isJobIdString(body.previousJobId)) {
      previousJobId = body.previousJobId;
    }
  } catch {
    // use defaults
  }

  if (previousJobId) {
    removeReelUploadFile(previousJobId);
    await deleteJob(previousJobId);
  }

  const jobId = await createJob({ niche });
  await setJob(jobId, { status: "processing" });

  const uploadsDir = getUploadsDir();
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const destPath = path.join(uploadsDir, `${jobId}.mp4`);

  const pipelinePromise = runReelPipeline({ voice, subtitleSize, niche })
    .then(async ({ videoPath, workDir }) => {
      fs.copyFileSync(videoPath, destPath);
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Failed to remove pipeline work dir:", e);
      }
      await setJob(jobId, {
        status: "completed",
        videoUrl: `/api/videos/${jobId}`,
      });
    })
    .catch(async (err) => {
      console.error("Pipeline failed:", err);
      await setJob(jobId, {
        status: "failed",
        error: err instanceof Error ? err.message : "Pipeline failed",
      });
    });

  if (process.env.VERCEL) {
    const { waitUntil } = await import("@vercel/functions");
    waitUntil(pipelinePromise);
  }

  const rateLimit = getRateLimitStatus(ip);
  return NextResponse.json({ jobId, rateLimit }, { status: 202 });
}
