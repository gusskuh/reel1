"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { NICHE_OPTIONS, nicheDisplayLabel, type Niche } from "@/lib/nicheConfig";
import { NICHE_SEO } from "@/lib/nicheSeoContent";
import { USER_SIGNUP_REEL_CREDITS } from "@/lib/reelQuotaConstants";
import GeneratingStatus from "./components/GeneratingStatus";
import { useRateLimit } from "./components/RateLimitContext";
import RegisterBonusModal from "./components/RegisterBonusModal";

const POLL_INTERVAL_MS = 5000;
/** Retries when host returns 502/empty body (OOM/restart on small instances). */
const MAX_JOB_POLL_TRANSIENT_FAILURES = 18;
/** Stop polling if job never reaches completed/failed (stuck pipeline, OOM, hung ffmpeg). */
const MAX_JOB_POLL_WALL_MS = 25 * 60 * 1000;

/** Avoids "Unexpected end of JSON input" when the proxy returns 502 with an empty body. */
async function readJsonBody<T>(r: Response): Promise<T | null> {
  const text = await r.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

type JobStatus = "pending" | "processing" | "completed" | "failed";

type RateLimitInfo = {
  used: number;
  remaining: number;
  limit: number;
  resetAt: number | null;
  kind: "guest" | "user";
};

const VOICE_OPTIONS: { value: string; label: string }[] = [
  { value: "alloy", label: "Neutral" },
  { value: "echo", label: "Eric" },
  { value: "fable", label: "British" },
  { value: "onyx", label: "Male" },
  { value: "nova", label: "Female" },
  { value: "shimmer", label: "Sarah" },
];

const SUBTITLE_OPTIONS: { value: string; label: string }[] = [
  { value: "s", label: "Small" },
  { value: "m", label: "Medium" },
  { value: "l", label: "Large" },
];

export default function HomeClient({
  initialNiche,
  nicheLanding = false,
}: {
  initialNiche?: Niche;
  nicheLanding?: boolean;
}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState("alloy");
  const [subtitleSize, setSubtitleSize] = useState<"s" | "m" | "l">("m");
  const [niche, setNiche] = useState<Niche>(() => initialNiche ?? "financial");
  const { rateLimit, setRateLimit, refresh: refreshRateLimit } = useRateLimit();
  const [quotaGate, setQuotaGate] = useState<"none" | "register" | "credits">("none");
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const [tiktokConfigured, setTiktokConfigured] = useState<boolean | null>(null);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokDisplayName, setTiktokDisplayName] = useState<string | undefined>();
  const [tiktokPublishing, setTiktokPublishing] = useState(false);
  const [tiktokPublishError, setTiktokPublishError] = useState<string | null>(null);
  const [tiktokShareUrl, setTiktokShareUrl] = useState<string | null>(null);

  const refreshTiktokStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/tiktok/status");
      if (!r.ok) return;
      const d = await readJsonBody<{
        configured?: boolean;
        connected?: boolean;
        displayName?: string;
      }>(r);
      if (!d) return;
      setTiktokConfigured(d.configured === true);
      setTiktokConnected(!!d.connected);
      setTiktokDisplayName(d.displayName);
    } catch {
      setTiktokConfigured(false);
      setTiktokConnected(false);
    }
  }, []);

  /** Stale banners: e.g. needs_credits after a failed generate, then quota fixed / refetched. */
  useEffect(() => {
    if (!rateLimit) return;
    setQuotaGate((prev) => {
      if (rateLimit.remaining > 0 && prev === "credits") return "none";
      if (rateLimit.kind === "user" && prev === "register") return "none";
      return prev;
    });
  }, [rateLimit]);

  useEffect(() => {
    refreshTiktokStatus();
  }, [refreshTiktokStatus]);

  useEffect(() => {
    if (initialNiche) setNiche(initialNiche);
  }, [initialNiche]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tiktok") === "connected") {
      refreshTiktokStatus();
      window.history.replaceState({}, "", window.location.pathname);
    }
    const terr = params.get("tiktok_error");
    if (terr) {
      setTiktokPublishError(decodeURIComponent(terr));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refreshTiktokStatus]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setQuotaGate("none");
    const previousJobId = jobId;
    setJobId(null);
    setStatus(null);
    setVideoUrl(null);
    setTiktokPublishError(null);
    setTiktokShareUrl(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice,
          subtitleSize,
          niche,
          ...(previousJobId ? { previousJobId } : {}),
        }),
      });
      if (!res.ok) {
        const errBody = await readJsonBody<{
          error?: string;
          code?: string;
          rateLimit?: RateLimitInfo;
        }>(res);
        await refreshRateLimit();
        if (res.status === 403 && errBody?.code === "needs_register") {
          setQuotaGate("register");
          setRegisterModalOpen(true);
          if (errBody.rateLimit) {
            setRateLimit({
              used: errBody.rateLimit.used,
              remaining: errBody.rateLimit.remaining,
              limit: errBody.rateLimit.limit,
              resetAt: errBody.rateLimit.resetAt ?? null,
              kind: errBody.rateLimit.kind ?? "guest",
            });
          }
          throw new Error(
            errBody?.error || "Create a free account to keep generating reels."
          );
        }
        if (res.status === 403 && errBody?.code === "needs_credits") {
          setQuotaGate("credits");
          if (errBody.rateLimit) {
            setRateLimit({
              used: errBody.rateLimit.used,
              remaining: errBody.rateLimit.remaining,
              limit: errBody.rateLimit.limit,
              resetAt: errBody.rateLimit.resetAt ?? null,
              kind: "user",
            });
          }
          throw new Error(errBody?.error || "No reel credits left.");
        }
        throw new Error(errBody?.error || `Request failed: ${res.status}`);
      }
      const data = await readJsonBody<{
        jobId: string;
        rateLimit?: {
          used: number;
          remaining: number;
          limit: number;
          resetAt?: number | null;
          kind?: "guest" | "user";
        };
      }>(res);
      if (!data?.jobId) {
        throw new Error("Empty or invalid response from server. Try again.");
      }
      const { jobId: id, rateLimit: rl } = data;
      if (rl) {
        setRateLimit({
          used: rl.used,
          remaining: rl.remaining,
          limit: rl.limit,
          resetAt: rl.resetAt ?? null,
          kind: rl.kind === "user" ? "user" : "guest",
        });
      }
      setJobId(id);
      setStatus("processing");

      const pollStartedAt = Date.now();
      let transientFailures = 0;
      const poll = async () => {
        if (Date.now() - pollStartedAt > MAX_JOB_POLL_WALL_MS) {
          setError(
            "Generation is taking too long (the server may have run out of memory or the job stalled). Check Render logs, try a larger instance, then generate again."
          );
          setLoading(false);
          return;
        }
        try {
          const r = await fetch(`/api/jobs/${id}`);
          const text = await r.text();

          if (!r.ok) {
            // 404 = job missing from store (restart, OOM, or another instance without Redis).
            // 5xx = proxy / server error. Retry both—sometimes the next poll hits a healthy instance.
            if (r.status === 404 || r.status >= 500) {
              transientFailures++;
              if (transientFailures >= MAX_JOB_POLL_TRANSIENT_FAILURES) {
                if (r.status === 404) {
                  setError(
                    "Lost track of this job (server restarted or jobs only live in memory). Add Upstash Redis: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Render, then redeploy—or generate a new reel."
                  );
                } else {
                  setError(
                    "Server stopped responding while checking status. Heavy video work often needs more RAM—try a larger Render instance, or refresh and try again."
                  );
                }
                setLoading(false);
                return;
              }
              setTimeout(poll, POLL_INTERVAL_MS);
              return;
            }
            setError(`Status check failed (${r.status})`);
            setLoading(false);
            return;
          }

          let j: { status: JobStatus; videoUrl?: string; error?: string };
          try {
            j = text
              ? (JSON.parse(text) as typeof j)
              : { status: "processing" };
          } catch {
            transientFailures++;
            if (transientFailures >= MAX_JOB_POLL_TRANSIENT_FAILURES) {
              setError(
                "Could not read job status. Refresh the page—the reel may still finish on the server."
              );
              setLoading(false);
              return;
            }
            setTimeout(poll, POLL_INTERVAL_MS);
            return;
          }

          transientFailures = 0;
          setStatus(j.status);
          if (j.status === "completed" && j.videoUrl) {
            setVideoUrl(j.videoUrl);
            setLoading(false);
            return;
          }
          if (j.status === "failed") {
            setError(j.error || "Generation failed");
            setLoading(false);
            return;
          }
          setTimeout(poll, POLL_INTERVAL_MS);
        } catch {
          transientFailures++;
          if (transientFailures >= MAX_JOB_POLL_TRANSIENT_FAILURES) {
            setError("Network error while polling. Check your connection and refresh.");
            setLoading(false);
            return;
          }
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      };
      poll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function handlePublishTiktok() {
    if (!jobId) return;
    setTiktokPublishing(true);
    setTiktokPublishError(null);
    setTiktokShareUrl(null);
    try {
      const r = await fetch("/api/tiktok/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = (await readJsonBody<{ error?: string; shareUrl?: string }>(
        r
      )) ?? {};
      if (!r.ok) throw new Error(data.error || `Publish failed (${r.status})`);
      if (data.shareUrl) setTiktokShareUrl(data.shareUrl);
    } catch (e) {
      setTiktokPublishError(
        e instanceof Error ? e.message : "Could not post to TikTok"
      );
    } finally {
      setTiktokPublishing(false);
    }
  }

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
          fontWeight: 700,
          marginBottom: "0.5rem",
          background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {nicheLanding ? `${nicheDisplayLabel(niche)} AI reels` : "AI Reels"}
      </h1>
      <p style={{ marginBottom: "1rem", color: "#a0a0a0", maxWidth: "32rem" }}>
        {nicheLanding
          ? NICHE_SEO[niche].heroLead
          : `Pick a category — Stocks News from market data, or top headlines (US). Three free reels as a guest, then a quick free account for ${USER_SIGNUP_REEL_CREDITS} more.`}
      </p>

      {rateLimit && (
        <div style={{ marginBottom: "1.25rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            <span style={{ color: "#e8e8e8", fontWeight: 600 }}>
              {rateLimit.remaining}/{rateLimit.limit}
            </span>{" "}
            {rateLimit.kind === "user" ? "reel credits" : "free guest reels"}
          </p>
        </div>
      )}

      {quotaGate === "register" && (
        <div
          style={{
            marginBottom: "1.25rem",
            maxWidth: "26rem",
            padding: "1rem 1.25rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(0, 212, 255, 0.35)",
            background: "rgba(0, 212, 255, 0.08)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "0.95rem", color: "#e8e8e8", marginBottom: "0.75rem" }}>
            You’ve used all free guest reels. Create a free account to unlock{" "}
            <strong style={{ color: "#7dd3fc" }}>{USER_SIGNUP_REEL_CREDITS} bonus credits</strong>.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
            <Link
              href="/register"
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: "0.375rem",
                fontWeight: 600,
                fontSize: "0.9rem",
                background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
                color: "#0a0a12",
              }}
            >
              Sign up free
            </Link>
            <Link
              href="/login"
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: "0.375rem",
                fontWeight: 500,
                fontSize: "0.9rem",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#e8e8e8",
              }}
            >
              Log in
            </Link>
          </div>
        </div>
      )}

      {quotaGate === "credits" && (
        <div
          style={{
            marginBottom: "1.25rem",
            maxWidth: "26rem",
            padding: "1rem 1.25rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(248, 113, 113, 0.35)",
            background: "rgba(248, 113, 113, 0.08)",
            fontSize: "0.95rem",
            color: "#fecaca",
            textAlign: "center",
          }}
        >
          <p style={{ marginBottom: "0.75rem" }}>
            You’re out of reel credits. Buy a pack to keep generating.
          </p>
          <Link
            href="/buy-credits"
            style={{
              display: "inline-block",
              padding: "0.55rem 1.1rem",
              borderRadius: "0.375rem",
              fontWeight: 600,
              fontSize: "0.9rem",
              background: "linear-gradient(90deg, #34d399, #059669)",
              color: "#0a0a12",
            }}
          >
            Buy credits
          </Link>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <label
            htmlFor="niche"
            style={{
              display: "block",
              fontSize: "0.8rem",
              color: "#9ca3af",
              marginBottom: "0.35rem",
            }}
          >
            Niche
          </label>
          <select
            id="niche"
            value={niche}
            onChange={(e) => setNiche(e.target.value as Niche)}
            disabled={loading}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#e8e8e8",
              fontSize: "0.9rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {NICHE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="voice"
            style={{
              display: "block",
              fontSize: "0.8rem",
              color: "#9ca3af",
              marginBottom: "0.35rem",
            }}
          >
            Voice
          </label>
          <select
            id="voice"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            disabled={loading}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#e8e8e8",
              fontSize: "0.9rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {VOICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="subtitleSize"
            style={{
              display: "block",
              fontSize: "0.8rem",
              color: "#9ca3af",
              marginBottom: "0.35rem",
            }}
          >
            Subtitle size
          </label>
          <select
            id="subtitleSize"
            value={subtitleSize}
            onChange={(e) => setSubtitleSize(e.target.value as "s" | "m" | "l")}
            disabled={loading}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#e8e8e8",
              fontSize: "0.9rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {SUBTITLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (rateLimit?.kind === "guest" && rateLimit.remaining === 0) {
            setRegisterModalOpen(true);
            return;
          }
          if (rateLimit?.kind === "user" && rateLimit.remaining === 0) {
            window.location.href = "/buy-credits";
            return;
          }
          void handleGenerate();
        }}
        disabled={loading}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.1rem",
          fontWeight: 600,
          border: "none",
          borderRadius: "0.5rem",
          background:
            loading
              ? "#333"
              : rateLimit?.kind === "user" && rateLimit.remaining === 0
                ? "linear-gradient(90deg, #34d399, #059669)"
                : rateLimit?.kind === "guest" && rateLimit.remaining === 0
                  ? "linear-gradient(90deg, #0891b2, #7c3aed)"
                  : "linear-gradient(90deg, #00d4ff, #7c3aed)",
          color: "#fff",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 20px rgba(0, 212, 255, 0.3)",
          transition: "opacity 0.2s, transform 0.2s",
        }}
      >
        {loading
          ? "Generating…"
          : rateLimit?.kind === "user" && rateLimit.remaining === 0
            ? "Buy credits"
            : rateLimit?.kind === "guest" && rateLimit.remaining === 0
              ? "Guest limit reached — tap to continue"
              : "Generate Reel"}
      </button>

      <RegisterBonusModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
      />

      <GeneratingStatus active={loading} />

      {error && (
        <p
          style={{
            marginTop: "1rem",
            color: "#f87171",
            fontSize: "0.95rem",
            maxWidth: "28rem",
          }}
        >
          {error}
        </p>
      )}

      {status === "completed" && videoUrl && (
        <div
          style={{
            marginTop: "2rem",
            width: "100%",
            maxWidth: "360px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <video
            src={videoUrl}
            controls
            style={{
              width: "100%",
              borderRadius: "0.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          />
          <a
            href={videoUrl}
            download="reel.mp4"
            style={{
              padding: "0.75rem 1.5rem",
              background: "linear-gradient(90deg, #10b981, #059669)",
              color: "#fff",
              borderRadius: "0.5rem",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}
          >
            Download Reel
          </a>

          <div
            style={{
              width: "100%",
              marginTop: "0.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#f472b6",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "0.5rem",
              }}
            >
              TikTok
            </p>

            {tiktokConfigured === null ? (
              <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Loading TikTok options…</p>
            ) : !tiktokConfigured ? (
              <>
                <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                  Posting to TikTok is not enabled on this environment yet. Add{" "}
                  <code style={{ color: "#e8e8e8" }}>TIKTOK_CLIENT_KEY</code>,{" "}
                  <code style={{ color: "#e8e8e8" }}>TIKTOK_CLIENT_SECRET</code>,{" "}
                  <code style={{ color: "#e8e8e8" }}>TIKTOK_REDIRECT_URI</code> (must match your TikTok app
                  callback URL), and a 16+ character{" "}
                  <code style={{ color: "#e8e8e8" }}>TIKTOK_SESSION_SECRET</code> in{" "}
                  <code style={{ color: "#e8e8e8" }}>.env</code>, then restart the server. See{" "}
                  <code style={{ color: "#e8e8e8" }}>TIKTOK_SETUP.md</code>.
                </p>
              </>
            ) : (
              <>
                {tiktokConnected ? (
                  <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                    TikTok:{" "}
                    <span style={{ color: "#e8e8e8" }}>
                      {tiktokDisplayName || "Connected"}
                    </span>
                  </p>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                    Post this reel to your TikTok (opens login once).
                  </p>
                )}

                {!tiktokConnected ? (
                  <a
                    href="/api/tiktok/auth"
                    style={{
                      display: "inline-block",
                      padding: "0.65rem 1.25rem",
                      background: "#fe2c55",
                      color: "#fff",
                      borderRadius: "0.5rem",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                  >
                    Connect TikTok
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handlePublishTiktok}
                    disabled={tiktokPublishing}
                    style={{
                      padding: "0.65rem 1.25rem",
                      background: tiktokPublishing ? "#555" : "#fe2c55",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: tiktokPublishing ? "not-allowed" : "pointer",
                    }}
                  >
                    {tiktokPublishing ? "Posting…" : "Post to TikTok"}
                  </button>
                )}

                {tiktokPublishError && (
                  <p
                    style={{
                      marginTop: "0.75rem",
                      fontSize: "0.85rem",
                      color: "#f87171",
                    }}
                  >
                    {tiktokPublishError}
                  </p>
                )}
                {tiktokShareUrl && (
                  <p style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
                    <a href={tiktokShareUrl} style={{ color: "#00d4ff" }} rel="noopener noreferrer">
                      Open TikTok link
                    </a>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
