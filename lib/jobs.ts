/**
 * In-memory job store for MVP. Jobs lost on restart.
 * Uses globalThis in dev so the store survives Next.js hot module reload.
 */
import { randomUUID } from "crypto";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
  status: JobStatus;
  videoUrl?: string;
  error?: string;
  createdAt: number;
  /** Niche selected for this generation (for TikTok metadata, etc.) */
  niche?: string;
}

const globalForJobs = globalThis as unknown as { jobs: Map<string, Job> | undefined };
const jobs = globalForJobs.jobs ?? new Map<string, Job>();
if (process.env.NODE_ENV !== "production") globalForJobs.jobs = jobs;

export function createJob(meta?: { niche?: string }): string {
  const id = randomUUID();
  jobs.set(id, {
    status: "pending",
    createdAt: Date.now(),
    ...(meta?.niche ? { niche: meta.niche } : {}),
  });
  return id;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function setJob(
  id: string,
  updates: Partial<Pick<Job, "status" | "videoUrl" | "error" | "niche">>
) {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, updates);
}

export function deleteJob(id: string): void {
  jobs.delete(id);
}
