import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({
    status: job.status,
    videoUrl: job.videoUrl,
    error: job.error,
  });
}
