import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createJob, deleteJob, setJob } from "@/lib/jobs";
import { runReelPipeline } from "@/lib/runReelPipeline";
import { checkRateLimit, getRateLimitStatus } from "@/lib/rateLimit";
import { isJobIdString, removeReelUploadFile } from "@/lib/reelCleanup";

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
  const VALID_NICHES = [
    "financial",
    "inspirational",
    "health",
    "news",
    "fitness",
    "finance",
    "tech",
    "food",
    "relationships",
  ] as const;
  let niche: (typeof VALID_NICHES)[number] = "financial";
  let previousJobId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.voice && ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(body.voice)) {
      voice = body.voice;
    }
    if (body.subtitleSize && ["s", "m", "l"].includes(body.subtitleSize)) {
      subtitleSize = body.subtitleSize;
    }
    if (body.niche && VALID_NICHES.includes(body.niche as (typeof VALID_NICHES)[number])) {
      niche = body.niche as (typeof VALID_NICHES)[number];
    }
    if (typeof body.previousJobId === "string" && isJobIdString(body.previousJobId)) {
      previousJobId = body.previousJobId;
    }
  } catch {
    // use defaults
  }

  if (previousJobId) {
    removeReelUploadFile(previousJobId);
    deleteJob(previousJobId);
  }

  const jobId = createJob({ niche });
  setJob(jobId, { status: "processing" });

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const destPath = path.join(uploadsDir, `${jobId}.mp4`);

  runReelPipeline({ voice, subtitleSize, niche })
    .then(async ({ videoPath, workDir }) => {
      fs.copyFileSync(videoPath, destPath);
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Failed to remove pipeline work dir:", e);
      }
      setJob(jobId, {
        status: "completed",
        videoUrl: `/api/videos/${jobId}`,
      });
    })
    .catch((err) => {
      console.error("Pipeline failed:", err);
      setJob(jobId, {
        status: "failed",
        error: err instanceof Error ? err.message : "Pipeline failed",
      });
    });

  const rateLimit = getRateLimitStatus(ip);
  return NextResponse.json({ jobId, rateLimit }, { status: 202 });
}
