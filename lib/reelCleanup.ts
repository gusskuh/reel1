import fs from "fs";
import path from "path";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isJobIdString(s: string): boolean {
  return UUID_RE.test(s);
}

/** Deletes uploads/{jobId}.mp4 if present. Only accepts UUID-shaped ids (path safety). */
export function removeReelUploadFile(jobId: string): void {
  if (!isJobIdString(jobId)) return;
  const file = path.join(process.cwd(), "uploads", `${jobId}.mp4`);
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch (e) {
    console.error("removeReelUploadFile:", e);
  }
}
