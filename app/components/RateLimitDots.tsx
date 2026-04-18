"use client";

import { useRateLimit } from "./RateLimitContext";
import GoldCoin from "./GoldCoin";

export default function RateLimitDots() {
  const { rateLimit } = useRateLimit();

  if (!rateLimit) return null;

  const aria =
    rateLimit.kind === "user"
      ? `${rateLimit.remaining} reel credits remaining`
      : `${rateLimit.remaining} of ${rateLimit.limit} free guest reels remaining`;

  return (
    <div
      className="rate-limit-row"
      aria-label={aria}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.3rem 0.65rem",
        borderRadius: "999px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <GoldCoin size={26} />
      <span
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "#c4b5fd",
          letterSpacing: "0.01em",
        }}
      >
        {rateLimit.remaining}
      </span>
    </div>
  );
}
