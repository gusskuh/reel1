import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 300;
import { getUploadsDir } from "@/lib/dataRoot";
import { getJob } from "@/lib/jobs";
import {
  ensureValidAccessToken,
  uploadVideoToTikTok,
} from "@/lib/tiktok/api";
import { generateWebReelTikTokMetadata } from "@/lib/tiktok/metadata";
import {
  TIKTOK_TOKEN_COOKIE,
  parseTokenCookie,
  serializeTokenCookie,
  tokenCookieOptions,
  getSessionSecret,
} from "@/lib/tiktok/webSession";

export async function POST(req: Request) {
  try {
    getSessionSecret();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Missing session secret";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return NextResponse.json(
      { error: "TikTok not configured on server." },
      { status: 501 }
    );
  }

  let body: { jobId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const jobId = body.jobId;
  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json({ error: "jobId required." }, { status: 400 });
  }

  const cookieStore = cookies();
  const raw = cookieStore.get(TIKTOK_TOKEN_COOKIE)?.value;
  const token = parseTokenCookie(raw);
  if (!token?.access_token) {
    return NextResponse.json(
      { error: "Connect TikTok first." },
      { status: 401 }
    );
  }

  const job = getJob(jobId);
  if (!job || job.status !== "completed") {
    return NextResponse.json(
      { error: "Video not ready or job not found." },
      { status: 400 }
    );
  }

  const videoPath = path.join(getUploadsDir(), `${jobId}.mp4`);
  if (!fs.existsSync(videoPath)) {
    return NextResponse.json(
      { error: "Video file missing on server." },
      { status: 404 }
    );
  }

  try {
    let session = await ensureValidAccessToken(token, clientKey, clientSecret);
    const meta = generateWebReelTikTokMetadata(job.niche ?? "financial");

    const { shareUrl } = await uploadVideoToTikTok(
      session.access_token,
      videoPath,
      meta,
      { log: (m) => console.log(`[TikTok publish] ${m}`) }
    );

    const res = NextResponse.json({ ok: true, shareUrl });

    if (
      session.access_token !== token.access_token ||
      session.refresh_token !== token.refresh_token
    ) {
      res.cookies.set(
        TIKTOK_TOKEN_COOKIE,
        serializeTokenCookie(session),
        tokenCookieOptions
      );
    }

    return res;
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "TikTok upload failed";
    console.error("[TikTok publish]", e);
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
