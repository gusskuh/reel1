import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createJob, deleteJob, setJob } from "@/lib/jobs";
import { runReelPipeline } from "@/lib/runReelPipeline";
import {
  getReelQuotaSnapshot,
  getUserReelQuotaWithAdmin,
  tryConsumeGuestReel,
  tryConsumeUserReelCredit,
} from "@/lib/reelQuota";
import { isJobIdString, removeReelUploadFile } from "@/lib/reelCleanup";
import { getUploadsDir } from "@/lib/dataRoot";
import { isValidNiche, type Niche } from "@/lib/nicheConfig";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
/** Vercel / Render: allow long pipeline (requires Pro on Vercel for >60s). */
export const maxDuration = 300;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let serviceAdmin: ReturnType<typeof getServiceRoleClient> = null;

  if (user) {
    serviceAdmin = getServiceRoleClient();
    if (!serviceAdmin) {
      return NextResponse.json(
        {
          error:
            "Missing SUPABASE_SERVICE_ROLE_KEY. In Supabase: Project Settings → API → copy the service_role secret into .env (server only), restart the dev server, and add the same var on Render. Never put this key in NEXT_PUBLIC_* or client code.",
        },
        { status: 500 }
      );
    }
    const consumed = await tryConsumeUserReelCredit(serviceAdmin, user.id);
    if (!consumed.ok) {
      const rateLimit = await getUserReelQuotaWithAdmin(serviceAdmin, user.id);
      return NextResponse.json(
        {
          error: "No reel credits left.",
          code: "needs_credits",
          rateLimit,
        },
        { status: 403 }
      );
    }
  } else {
    const guestOk = await tryConsumeGuestReel(ip);
    if (!guestOk.ok) {
      const rateLimit = await getReelQuotaSnapshot(ip, null, null);
      return NextResponse.json(
        {
          error: "You’ve used all free guest reels. Create a free account to get more reel credits.",
          code: "needs_register",
          rateLimit,
        },
        { status: 403 }
      );
    }
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

  const rateLimit =
    user && serviceAdmin
      ? await getUserReelQuotaWithAdmin(serviceAdmin, user.id)
      : await getReelQuotaSnapshot(ip, user?.id ?? null, supabase);
  return NextResponse.json({ jobId, rateLimit }, { status: 202 });
}
