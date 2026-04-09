/**
 * Simple in-memory rate limit: 3 requests per IP per hour.
 * Uses globalThis in dev so the store survives Next.js hot module reload.
 */
type RateEntry = { count: number; resetAt: number };

const globalForRate = globalThis as unknown as { rateLimitStore: Map<string, RateEntry> | undefined };
const store = globalForRate.rateLimitStore ?? new Map<string, RateEntry>();
if (process.env.NODE_ENV !== "production") globalForRate.rateLimitStore = store;

export const RATE_LIMIT_MAX = 99;
const MAX_REQUESTS = RATE_LIMIT_MAX;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Current usage for an IP (read-only; call after checkRateLimit to see post-increment state). */
export function getRateLimitStatus(ip: string): {
  used: number;
  remaining: number;
  limit: number;
  resetAt: number | null;
} {
  const key = normalizeClientIp(ip);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    return { used: 0, remaining: MAX_REQUESTS, limit: MAX_REQUESTS, resetAt: null };
  }

  const used = Math.min(entry.count, MAX_REQUESTS);
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  return {
    used,
    remaining,
    limit: MAX_REQUESTS,
    resetAt: entry.resetAt,
  };
}

/** Merge localhost variants so ::1 and 127.0.0.1 share one bucket */
export function normalizeClientIp(ip: string): string {
  const t = ip.trim();
  if (t === "::1" || t === "127.0.0.1" || t === "::ffff:127.0.0.1") {
    return "loopback";
  }
  return t;
}

export function checkRateLimit(ip: string): { ok: boolean; error?: string } {
  const key = normalizeClientIp(ip);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    const minsLeft = Math.ceil((entry.resetAt - now) / 60000);
    return {
      ok: false,
      error: `Rate limit exceeded. Try again in ${minsLeft} minute(s).`,
    };
  }

  entry.count++;
  return { ok: true };
}
