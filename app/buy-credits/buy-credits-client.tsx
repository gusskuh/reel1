"use client";

import Link from "next/link";
import { useState } from "react";
import { CREDIT_PACKS } from "@/lib/stripeCredits";

async function readJson<T>(r: Response): Promise<T | null> {
  const t = await r.text();
  if (!t.trim()) return null;
  try {
    return JSON.parse(t) as T;
  } catch {
    return null;
  }
}

export default function BuyCreditsClient() {
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(tier: string) {
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
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 1rem 3rem",
        color: "#e8e8e8",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: 700,
          marginBottom: "0.5rem",
          textAlign: "center",
          background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Buy reel credits
      </h1>
      <p style={{ color: "#9ca3af", textAlign: "center", maxWidth: "28rem", marginBottom: "2rem" }}>
        Choose a pack. After payment you&apos;ll return here and your balance updates automatically.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "100%",
          maxWidth: "22rem",
        }}
      >
        {CREDIT_PACKS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busyTier !== null}
            onClick={() => void startCheckout(p.id)}
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(0, 212, 255, 0.35)",
              background: "rgba(0, 212, 255, 0.08)",
              color: "#e8e8e8",
              cursor: busyTier !== null ? "wait" : "pointer",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              opacity: busyTier !== null && busyTier !== p.id ? 0.5 : 1,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>${p.labelUsd}</span>
            <span style={{ color: "#a5b4fc", fontSize: "0.95rem" }}>
              {p.credits} credits{busyTier === p.id ? " — redirecting…" : ""}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p style={{ marginTop: "1.25rem", color: "#f87171", fontSize: "0.95rem", maxWidth: "28rem", textAlign: "center" }}>
          {error}
        </p>
      )}

      <Link
        href="/"
        style={{
          marginTop: "2rem",
          fontSize: "0.9rem",
          color: "#7dd3fc",
        }}
      >
        ← Back to generator
      </Link>
    </main>
  );
}
