"use client";

import { useCallback, useEffect, useState } from "react";

/** Dispatched from home after /api/rate-limit updates so the header stays in sync. */
export const RATE_LIMIT_REFRESH_EVENT = "reelgen-rate-limit-refresh";

type RateInfo = {
  used: number;
  remaining: number;
  limit: number;
  resetAt: number | null;
};

async function readJsonBody<T>(r: Response): Promise<T | null> {
  const text = await r.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function RateLimitDots() {
  const [rateLimit, setRateLimit] = useState<RateInfo | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/rate-limit");
      if (!r.ok) return;
      const data = await readJsonBody<RateInfo>(r);
      if (!data) return;
      setRateLimit({
        used: data.used,
        remaining: data.remaining,
        limit: data.limit,
        resetAt: data.resetAt,
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const onRefresh = () => {
      refresh();
    };
    window.addEventListener(RATE_LIMIT_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(RATE_LIMIT_REFRESH_EVENT, onRefresh);
  }, [refresh]);

  if (!rateLimit) return null;

  return (
    <div
      className="rate-limit-row"
      aria-label={`${rateLimit.remaining} of ${rateLimit.limit} free reels left this hour`}
    >
      <span className="rate-limit-label">{rateLimit.remaining} reels left</span>
      <div className="rate-limit-dot-track">
        {Array.from({ length: rateLimit.limit }).map((_, i) => (
          <span
            key={i}
            className="rate-limit-dot"
            style={{
              background:
                i < rateLimit.remaining
                  ? "linear-gradient(135deg, #00d4ff, #7c3aed)"
                  : "rgba(255,255,255,0.12)",
              boxShadow:
                i < rateLimit.remaining ? "0 0 8px rgba(0, 212, 255, 0.35)" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
