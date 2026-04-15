"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRateLimit } from "@/app/components/RateLimitContext";

type StatusPayload = {
  paid?: boolean;
  fulfilled?: boolean;
  creditsAdded?: number;
  reelCredits?: number;
  error?: string;
};

async function readJson<T>(r: Response): Promise<T | null> {
  const t = await r.text();
  if (!t.trim()) return null;
  try {
    return JSON.parse(t) as T;
  } catch {
    return null;
  }
}

export default function PurchaseThanksClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refresh: refreshRateLimit } = useRateLimit();

  const [message, setMessage] = useState<string>("Confirming your purchase…");
  const [creditsLine, setCreditsLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const poll = useCallback(async () => {
    if (!sessionId) return;
    const r = await fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(sessionId)}`);
    const data = await readJson<StatusPayload>(r);
    if (!r.ok) {
      if (r.status === 401) {
        setError("Sign in to see your updated credit balance.");
        setMessage("");
        return true;
      }
      setError(data?.error || "Could not verify this session.");
      setMessage("");
      return true;
    }
    if (data?.fulfilled && typeof data.reelCredits === "number") {
      const added =
        typeof data.creditsAdded === "number" ? `${data.creditsAdded} credits added. ` : "";
      setMessage("Thanks — your purchase is complete.");
      setCreditsLine(`${added}You now have ${data.reelCredits} reel credits.`);
      setDone(true);
      void refreshRateLimit();
      return true;
    }
    if (data?.paid === false) {
      setMessage("Payment is still processing. This page will update shortly.");
      return false;
    }
    setMessage("Payment received. Applying credits…");
    return false;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session. Return to the generator and try again.");
      setMessage("");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 45;

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const finished = await poll();
        if (finished || attempts >= maxAttempts) {
          if (!finished && attempts >= maxAttempts) {
            setMessage(
              "Your payment may still be finalizing. Refresh this page in a moment, or open the generator — credits usually appear within a minute."
            );
            setDone(true);
          }
          return;
        }
      } catch {
        if (!cancelled) setMessage("Still working…");
      }
      setTimeout(tick, 1000);
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [sessionId, poll]);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => {
      router.push("/");
    }, 4500);
    return () => window.clearTimeout(t);
  }, [done, router]);

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        color: "#e8e8e8",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: 700,
          marginBottom: "1rem",
          background: "linear-gradient(90deg, #34d399, #00d4ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Thank you
      </h1>
      {message && (
        <p style={{ color: "#d1d5db", maxWidth: "26rem", marginBottom: "0.75rem" }}>{message}</p>
      )}
      {creditsLine && (
        <p style={{ color: "#a5b4fc", maxWidth: "26rem", fontWeight: 600, marginBottom: "1rem" }}>
          {creditsLine}
        </p>
      )}
      {error && (
        <p style={{ color: "#f87171", maxWidth: "26rem", marginBottom: "1rem" }}>{error}</p>
      )}
      <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        {done ? "Sending you back to the generator…" : null}
      </p>
      <Link href="/" style={{ color: "#7dd3fc", fontSize: "0.95rem" }}>
        Go to generator now
      </Link>
    </main>
  );
}
