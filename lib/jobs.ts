/**
 * Job store: in-memory Map (OK for single long-lived Node) or Upstash Redis
 * when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (required for
 * Vercel serverless — each invocation is a different instance otherwise).
 */
import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
  status: JobStatus;
  videoUrl?: string;
  error?: string;
  createdAt: number;
  niche?: string;
}

const JOB_KEY = (id: string) => `reelgen:job:${id}`;
/** Keep keys from piling up in Redis (job polling + download window). */
const JOB_TTL_SEC = 60 * 60 * 6;

function useRedis(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

const globalRedis = globalThis as unknown as { __reelgenRedis?: Redis };
function getRedis(): Redis | null {
  if (!useRedis()) return null;
  if (!globalRedis.__reelgenRedis) {
    globalRedis.__reelgenRedis = Redis.fromEnv();
  }
  return globalRedis.__reelgenRedis;
}

const globalForJobs = globalThis as unknown as {
  jobs: Map<string, Job> | undefined;
};
if (!globalForJobs.jobs) {
  globalForJobs.jobs = new Map<string, Job>();
}
const memoryJobs = globalForJobs.jobs;

export async function createJob(meta?: { niche?: string }): Promise<string> {
  const id = randomUUID();
  const job: Job = {
    status: "pending",
    createdAt: Date.now(),
    ...(meta?.niche ? { niche: meta.niche } : {}),
  };

  const r = getRedis();
  if (r) {
    await r.set(JOB_KEY(id), job, { ex: JOB_TTL_SEC });
  } else {
    memoryJobs.set(id, job);
  }
  return id;
}

export async function getJob(id: string): Promise<Job | undefined> {
  const r = getRedis();
  if (r) {
    const data = await r.get<Job>(JOB_KEY(id));
    return data ?? undefined;
  }
  return memoryJobs.get(id);
}

export async function setJob(
  id: string,
  updates: Partial<Pick<Job, "status" | "videoUrl" | "error" | "niche">>
): Promise<void> {
  const current = await getJob(id);
  if (!current) return;
  const next: Job = { ...current, ...updates };

  const r = getRedis();
  if (r) {
    await r.set(JOB_KEY(id), next, { ex: JOB_TTL_SEC });
  } else {
    memoryJobs.set(id, next);
  }
}

export async function deleteJob(id: string): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.del(JOB_KEY(id));
  } else {
    memoryJobs.delete(id);
  }
}
