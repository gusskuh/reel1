"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CREDIT_PACKS } from "@/lib/stripeCredits";
import GoldCoin from "@/app/components/GoldCoin";

async function readJson<T>(r: Response): Promise<T | null> {
  const t = await r.text();
  if (!t.trim()) return null;
  try {
    return JSON.parse(t) as T;
  } catch {
    return null;
  }
}

const POPULAR_TIER = "10";

export default function BuyCreditsClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(tier: string) {
    if (!isLoggedIn) {
      router.push(`/register?next=${encodeURIComponent("/buy-credits")}`);
      return;
    }
    setError(null);
    setBusyTier(tier);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await readJson<{ url?: string; error?: string }>(r);
      if (!r.ok) {
        setError(data?.error || `Could not start checkout (${r.status}).`);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError("No checkout URL returned.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusyTier(null);
    }
  }

  return (
    <>
      <style>{`
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
          width: 100%;
          max-width: 72rem;
        }
        .pricing-card-inner {
          padding: 7rem 1.5rem;
        }
        @media (max-width: 700px) {
          .pricing-grid {
            grid-template-columns: 1fr;
          }
          .pricing-card-inner {
            padding: 1.75rem 1.5rem;
          }
        }
      `}</style>
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "clamp(3rem, 7vw, 5rem) 1rem clamp(3rem, 6vw, 5rem)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 1rem",
            borderRadius: "999px",
            border: "1px solid rgba(124, 58, 237, 0.4)",
            background: "rgba(124, 58, 237, 0.1)",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#c4b5fd",
            marginBottom: "1.5rem",
          }}
        >
          <GoldCoin size={16} />
          <span>Reel Credits</span>
        </div>

        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            textAlign: "center",
            marginBottom: "0.75rem",
          }}
        >
          Simple,{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            transparent
          </span>{" "}
          pricing
        </h1>

        <p
          style={{
            color: "#6b7280",
            textAlign: "center",
            maxWidth: "28rem",
            marginBottom: "3rem",
            fontSize: "1.05rem",
            lineHeight: 1.65,
          }}
        >
          Buy a credit pack and generate reels instantly. Credits never expire.
        </p>

        {/* Packs grid */}
        <div className="pricing-grid">
          {CREDIT_PACKS.map((p) => {
            const isPopular = p.id === POPULAR_TIER;
            const isBusy = busyTier === p.id;

            return (
              <div
                key={p.id}
                style={{
                  position: "relative",
                  borderRadius: "1.1rem",
                  border: isPopular
                    ? "1.5px solid rgba(167, 139, 250, 0.6)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: isPopular
                    ? "linear-gradient(160deg, rgba(124,58,237,0.14) 0%, rgba(37,99,235,0.08) 100%)"
                    : "rgba(255,255,255,0.025)",
                  boxShadow: isPopular
                    ? "0 8px 32px rgba(124,58,237,0.2)"
                    : "0 4px 16px rgba(0,0,0,0.2)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1rem",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "999px",
                      background: "linear-gradient(90deg, #7c3aed, #2563eb)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Popular
                  </div>
                )}

                <div className="pricing-card-inner" style={{}}>

                  {/* Coin + price row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <GoldCoin size={32} />
                    <span
                      style={{
                        fontSize: "2rem",
                        fontWeight: 900,
                        letterSpacing: "-0.04em",
                        color: "#f1f5f9",
                      }}
                    >
                      ${p.labelUsd}
                    </span>
                  </div>

                  {/* Credits count */}
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: isPopular ? "#c4b5fd" : "#6b7280",
                      marginBottom: "1.5rem",
                      fontWeight: 500,
                    }}
                  >
                    {p.credits} reel credit{p.credits !== 1 ? "s" : ""}
                    {p.credits > p.labelUsd && (
                      <span
                        style={{
                          marginLeft: "0.4rem",
                          fontSize: "0.78rem",
                          color: "#34d399",
                          fontWeight: 700,
                        }}
                      >
                        +{p.credits - p.labelUsd} bonus
                      </span>
                    )}
                  </p>

                  {/* CTA button */}
                  <button
                    type="button"
                    disabled={busyTier !== null}
                    onClick={() => void handleClick(p.id)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.65rem",
                      border: isPopular ? "none" : "1px solid rgba(255,255,255,0.12)",
                      background: isBusy
                        ? "rgba(255,255,255,0.05)"
                        : isPopular
                          ? "linear-gradient(90deg, #7c3aed, #2563eb)"
                          : "rgba(255,255,255,0.06)",
                      color: isBusy ? "#6b7280" : "#fff",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      cursor: busyTier !== null ? "wait" : "pointer",
                      opacity: busyTier !== null && !isBusy ? 0.5 : 1,
                      boxShadow: isPopular && !isBusy
                        ? "0 4px 16px rgba(124,58,237,0.4)"
                        : "none",
                      transition: "opacity 0.2s",
                    }}
                  >
                    {isBusy
                      ? "Redirecting…"
                      : !isLoggedIn
                        ? "Get Started →"
                        : "Buy Now →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Guest nudge */}
        {!isLoggedIn && (
          <p
            style={{
              marginTop: "1.75rem",
              fontSize: "0.875rem",
              color: "#4b5563",
              textAlign: "center",
            }}
          >
            You&apos;ll be asked to create a free account before checkout.{" "}
            <Link href="/login?next=/buy-credits" style={{ color: "#a78bfa" }}>
              Already have one? Log in
            </Link>
          </p>
        )}

        {error && (
          <p
            style={{
              marginTop: "1.25rem",
              color: "#f87171",
              fontSize: "0.9rem",
              maxWidth: "28rem",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        {/* Fine print */}
        <p
          style={{
            marginTop: "2.5rem",
            fontSize: "0.8rem",
            color: "#374151",
            textAlign: "center",
            maxWidth: "28rem",
            lineHeight: 1.6,
          }}
        >
          Credits never expire · Secure checkout via Stripe · After payment your balance updates automatically
        </p>

        <Link
          href="/"
          style={{
            marginTop: "1.5rem",
            fontSize: "0.875rem",
            color: "#4b5563",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#4b5563"; }}
        >
          ← Back to generator
        </Link>
      </main>
    </>
  );
}
