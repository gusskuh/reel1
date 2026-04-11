"use client";

import { useState, useEffect, useCallback } from "react";
import { NICHE_OPTIONS, type Niche } from "@/lib/nicheConfig";
import GeneratingStatus from "./components/GeneratingStatus";

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

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState("alloy");
  const [subtitleSize, setSubtitleSize] = useState<"s" | "m" | "l">("m");
  const [niche, setNiche] = useState<Niche>("financial");
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);

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

  const refreshRateLimit = useCallback(async () => {
    try {
      const r = await fetch("/api/rate-limit");
      if (!r.ok) return;
      const data = await readJsonBody<{
        used: number;
        remaining: number;
        limit: number;
        resetAt: number | null;
      }>(r);
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
    refreshRateLimit();
  }, [refreshRateLimit]);

  useEffect(() => {
    refreshTiktokStatus();
  }, [refreshTiktokStatus]);

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
        const errBody = await readJsonBody<{ error?: string }>(res);
        if (res.status === 429) {
          await refreshRateLimit();
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
        AI Reels
      </h1>
      <p style={{ marginBottom: "1rem", color: "#a0a0a0", maxWidth: "32rem" }}>
        Pick a category — Stocks News from market data, or top headlines. One
        click, no account needed.
      </p>

      {rateLimit && (
        <div
          style={{
            marginBottom: "1.25rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.35rem",
              alignItems: "center",
            }}
            aria-label={`${rateLimit.remaining} of ${rateLimit.limit} free reels left this hour`}
          >
            {Array.from({ length: rateLimit.limit }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background:
                    i < rateLimit.remaining
                      ? "linear-gradient(135deg, #00d4ff, #7c3aed)"
                      : "rgba(255,255,255,0.12)",
                  boxShadow:
                    i < rateLimit.remaining
                      ? "0 0 10px rgba(0, 212, 255, 0.35)"
                      : "none",
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            <span style={{ color: "#e8e8e8", fontWeight: 600 }}>
              {rateLimit.remaining}/{rateLimit.limit}
            </span>{" "}
            reels left this hour
            {rateLimit.remaining === 0 && rateLimit.resetAt && (
              <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.8rem" }}>
                Resets{" "}
                {new Date(rateLimit.resetAt).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
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
        onClick={handleGenerate}
        disabled={loading || (rateLimit !== null && rateLimit.remaining === 0)}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.1rem",
          fontWeight: 600,
          border: "none",
          borderRadius: "0.5rem",
          background:
            loading || (rateLimit !== null && rateLimit.remaining === 0)
              ? "#333"
              : "linear-gradient(90deg, #00d4ff, #7c3aed)",
          color: "#fff",
          cursor:
            loading || (rateLimit !== null && rateLimit.remaining === 0)
              ? "not-allowed"
              : "pointer",
          boxShadow: "0 4px 20px rgba(0, 212, 255, 0.3)",
          transition: "opacity 0.2s, transform 0.2s",
        }}
      >
        {loading
          ? "Generating…"
          : rateLimit !== null && rateLimit.remaining === 0
            ? "Hourly limit reached"
            : "Generate Reel"}
      </button>

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
