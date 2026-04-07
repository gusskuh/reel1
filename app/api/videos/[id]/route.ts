import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { getJob } from "@/lib/jobs";
import { getUploadsDir } from "@/lib/dataRoot";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJob(id);
  if (!job || job.status !== "completed" || !job.videoUrl) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const videoPath = path.join(getUploadsDir(), `${id}.mp4`);
  if (!fs.existsSync(videoPath)) {
    return NextResponse.json({ error: "Video file not found" }, { status: 404 });
  }

  const stat = fs.statSync(videoPath);
  const stream = fs.createReadStream(videoPath);
  const webStream = Readable.toWeb(stream);

  return new Response(webStream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stat.size),
    },
  });
}
