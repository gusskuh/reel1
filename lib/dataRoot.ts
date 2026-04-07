import path from "path";

// All upload and temp paths should go through this module so deploy targets (e.g. Vercel) stay writable.

/**
 * Writable base for uploads/ and pipeline tmp dirs.
 * Vercel serverless: only /tmp is writable — using cwd throws EROFS.
 * Override with REELGEN_DATA_DIR if needed.
 */
export function getDataRoot(): string {
  if (process.env.REELGEN_DATA_DIR) {
    return process.env.REELGEN_DATA_DIR;
  }
  if (process.env.VERCEL) {
    return path.join("/tmp", "reelgen");
  }
  return process.cwd();
}

export function getUploadsDir(): string {
  return path.join(getDataRoot(), "uploads");
}

export function getPipelineTmpRoot(): string {
  return path.join(getDataRoot(), "tmp");
}
