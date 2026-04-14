"use client";

import { useRateLimit } from "./RateLimitContext";

export default function RateLimitDots() {
  const { rateLimit } = useRateLimit();

  if (!rateLimit) return null;

  const aria =
    rateLimit.kind === "user"
      ? `${rateLimit.remaining} reel credits of ${rateLimit.limit} shown in the meter`
      : `${rateLimit.remaining} of ${rateLimit.limit} free guest reels remaining`;

  const label =
    rateLimit.kind === "user"
      ? `${rateLimit.remaining} credits`
      : `${rateLimit.remaining} free`;

  return (
    <div className="rate-limit-row" aria-label={aria}>
      <span className="rate-limit-label">{label}</span>
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
