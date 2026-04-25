"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import posthog from "posthog-js";
import { NICHE_OPTIONS, nicheDisplayLabel, type Niche } from "@/lib/nicheConfig";
import { NICHE_SEO } from "@/lib/nicheSeoContent";
import { USER_SIGNUP_REEL_CREDITS } from "@/lib/reelQuotaConstants";
import GeneratingStatus from "./components/GeneratingStatus";
import GoldCoin from "./components/GoldCoin";
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

const FEATURE_CARDS = [
  {
    icon: "🎬",
    title: "AI-Powered Scripts",
    desc: "GPT writes engaging scripts from real-time news and market data so you never run out of content.",
  },
  {
    icon: "🎙️",
    title: "Human-Like Voices",
    desc: "Choose from multiple AI voices to give your reels a natural, professional narration.",
  },
  {
    icon: "📱",
    title: "Vertical Video Format",
    desc: "Every reel is perfectly formatted for TikTok, YouTube Shorts, and Instagram Reels.",
  },
  {
    icon: "⚡",
    title: "Ready in Seconds",
    desc: "From idea to finished reel in under a minute — no editing skills required.",
  },
];

const NICHE_TAGS = [
  "📈 Finance", "💰 Crypto", "🏠 Real Estate", "🌍 World News",
  "🇺🇸 US News", "⚽ Sports", "🎮 Gaming", "🧠 AI & Tech",
  "🍿 Entertainment", "🔬 Science", "📈 Finance", "💰 Crypto",
  "🏠 Real Estate", "🌍 World News", "🇺🇸 US News", "⚽ Sports",
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

  useEffect(() => {
    if (!rateLimit) return;
    setQuotaGate((prev) => {
      if (rateLimit.remaining > 0 && prev === "credits") return "none";
      if (rateLimit.kind === "user" && prev === "register") return "none";
      return prev;
    });
  }, [rateLimit]);

  useEffect(() => { refreshTiktokStatus(); }, [refreshTiktokStatus]);

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

    posthog.capture("reel_generation_started", {
      niche,
      voice,
      subtitle_size: subtitleSize,
      user_kind: rateLimit?.kind ?? "unknown",
    });

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
          posthog.capture("quota_gate_shown", { gate: "register", niche });
          if (errBody.rateLimit) {
            setRateLimit({
              used: errBody.rateLimit.used,
              remaining: errBody.rateLimit.remaining,
              limit: errBody.rateLimit.limit,
              resetAt: errBody.rateLimit.resetAt ?? null,
              kind: errBody.rateLimit.kind ?? "guest",
            });
          }
          throw new Error(errBody?.error || "Create a free account to keep generating reels.");
        }
        if (res.status === 403 && errBody?.code === "needs_credits") {
          setQuotaGate("credits");
          posthog.capture("quota_gate_shown", { gate: "credits", niche });
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
          setError("Generation is taking too long. Check server logs and try again.");
          setLoading(false);
          return;
        }
        try {
          const r = await fetch(`/api/jobs/${id}`);
          const text = await r.text();

          if (!r.ok) {
            if (r.status === 404 || r.status >= 500) {
              transientFailures++;
              if (transientFailures >= MAX_JOB_POLL_TRANSIENT_FAILURES) {
                if (r.status === 404) {
                  setError("Lost track of this job (server restarted). Add Upstash Redis or generate a new reel.");
                } else {
                  setError("Server stopped responding. Try a larger instance or refresh and try again.");
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
            j = text ? (JSON.parse(text) as typeof j) : { status: "processing" };
          } catch {
            transientFailures++;
            if (transientFailures >= MAX_JOB_POLL_TRANSIENT_FAILURES) {
              setError("Could not read job status. Refresh the page — the reel may still finish.");
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
            posthog.capture("reel_generation_completed", {
              niche,
              voice,
              subtitle_size: subtitleSize,
              job_id: id,
            });
            return;
          }
          if (j.status === "failed") {
            setError(j.error || "Generation failed");
            setLoading(false);
            posthog.capture("reel_generation_failed", {
              niche,
              voice,
              subtitle_size: subtitleSize,
              job_id: id,
              error: j.error || "Generation failed",
            });
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
    posthog.capture("tiktok_publish_clicked", { job_id: jobId, niche });
    try {
      const r = await fetch("/api/tiktok/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = (await readJsonBody<{ error?: string; shareUrl?: string }>(r)) ?? {};
      if (!r.ok) throw new Error(data.error || `Publish failed (${r.status})`);
      if (data.shareUrl) {
        setTiktokShareUrl(data.shareUrl);
        posthog.capture("tiktok_published", { job_id: jobId, niche, share_url: data.shareUrl });
      }
    } catch (e) {
      setTiktokPublishError(e instanceof Error ? e.message : "Could not post to TikTok");
    } finally {
      setTiktokPublishing(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    padding: "0.6rem 0.85rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#e8e8e8",
    fontSize: "0.9rem",
    cursor: loading ? "not-allowed" : "pointer",
    outline: "none",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#6b7280",
    marginBottom: "0.4rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  return (
    <>
      {/* Atmospheric background orbs */}
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>

        {/* ── Hero Section ── */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 2rem) clamp(2rem, 5vw, 4rem)",
          }}
        >
          {/* AI badge */}
          <div
            className="ai-badge"
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
              marginBottom: "1.75rem",
              letterSpacing: "0.03em",
            }}
          >
            <span>✨</span>
            <span>Powered by AI</span>
          </div>

          {/* Main headline */}
          <h1
            style={{
              fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: "800px",
              marginBottom: "1.5rem",
            }}
          >
            {nicheLanding ? (
              <>
                Create viral{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg, #a78bfa, #60a5fa, #34d399)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {nicheDisplayLabel(niche)}
                </span>{" "}
                reels on Auto-Pilot
              </>
            ) : (
              <>
                Create viral{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg, #a78bfa, #60a5fa, #34d399)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  faceless AI reels
                </span>
                <br />on Auto-Pilot.
              </>
            )}
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              color: "#9ca3af",
              maxWidth: "540px",
              lineHeight: 1.7,
              marginBottom: "2.5rem",
            }}
          >
            {nicheLanding
              ? NICHE_SEO[niche].heroLead
              : rateLimit?.kind === "user"
                ? "Pick a niche, choose a voice, and get a ready-to-post reel in seconds."
                : `Pick a niche, choose a voice, and get a ready-to-post reel in seconds. ${USER_SIGNUP_REEL_CREDITS} free credits when you sign up.`}
          </p>

          {/* Generator Card */}
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              padding: "clamp(1.25rem, 3vw, 2rem)",
              borderRadius: "1.25rem",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.08)",
            }}
          >
            {/* Quota display */}
            {rateLimit && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  marginBottom: "1.25rem",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <GoldCoin size={28} />
                <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  {rateLimit.kind === "user" ? "Credits remaining:" : "Free reels:"}
                </span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#c4b5fd" }}>
                  {rateLimit.remaining}
                </span>
              </div>
            )}

            {/* Quota gates */}
            {quotaGate === "register" && (
              <div
                style={{
                  marginBottom: "1.25rem",
                  padding: "1rem 1.25rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(167, 139, 250, 0.3)",
                  background: "rgba(124, 58, 237, 0.08)",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "0.9rem", color: "#e2e8f0", marginBottom: "0.85rem", lineHeight: 1.55 }}>
                  You've used all free guest reels.{" "}
                  <strong style={{ color: "#c4b5fd" }}>Sign up free</strong> to unlock{" "}
                  <strong style={{ color: "#c4b5fd" }}>{USER_SIGNUP_REEL_CREDITS} bonus credits</strong>.
                </p>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <Link
                    href="/register"
                    style={{
                      padding: "0.55rem 1.25rem",
                      borderRadius: "0.5rem",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      background: "linear-gradient(90deg, #7c3aed, #2563eb)",
                      color: "#fff",
                      boxShadow: "0 2px 12px rgba(124,58,237,0.4)",
                    }}
                  >
                    Sign up free
                  </Link>
                  <Link
                    href="/login"
                    style={{
                      padding: "0.55rem 1.1rem",
                      borderRadius: "0.5rem",
                      fontWeight: 500,
                      fontSize: "0.9rem",
                      border: "1px solid rgba(255,255,255,0.18)",
                      color: "#d1d5db",
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
                  padding: "1rem 1.25rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                  background: "rgba(248, 113, 113, 0.06)",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "0.9rem", color: "#fecaca", marginBottom: "0.85rem" }}>
                  You're out of reel credits. Buy a pack to keep generating.
                </p>
                <Link
                  href="/buy-credits"
                  style={{
                    display: "inline-block",
                    padding: "0.55rem 1.25rem",
                    borderRadius: "0.5rem",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    background: "linear-gradient(90deg, #34d399, #059669)",
                    color: "#fff",
                  }}
                >
                  Buy credits
                </Link>
              </div>
            )}

            {/* Controls */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "0.75rem",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <label htmlFor="niche" style={labelStyle}>Niche</label>
                <select
                  id="niche"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value as Niche)}
                  disabled={loading}
                  style={selectStyle}
                >
                  {NICHE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="voice" style={labelStyle}>Voice</label>
                <select
                  id="voice"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  disabled={loading}
                  style={selectStyle}
                >
                  {VOICE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="subtitleSize" style={labelStyle}>Subtitles</label>
                <select
                  id="subtitleSize"
                  value={subtitleSize}
                  onChange={(e) => setSubtitleSize(e.target.value as "s" | "m" | "l")}
                  disabled={loading}
                  style={selectStyle}
                >
                  {SUBTITLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generate button */}
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
                width: "100%",
                padding: "0.9rem 2rem",
                fontSize: "1rem",
                fontWeight: 700,
                border: "none",
                borderRadius: "0.75rem",
                background: loading
                  ? "rgba(255,255,255,0.06)"
                  : rateLimit?.kind === "user" && rateLimit.remaining === 0
                    ? "linear-gradient(90deg, #34d399, #059669)"
                    : rateLimit?.kind === "guest" && rateLimit.remaining === 0
                      ? "linear-gradient(90deg, #7c3aed, #2563eb)"
                      : "linear-gradient(90deg, #7c3aed, #2563eb)",
                color: loading ? "#6b7280" : "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 24px rgba(124, 58, 237, 0.45)",
                transition: "opacity 0.2s, box-shadow 0.2s",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLElement).style.opacity = "0.88";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 32px rgba(124, 58, 237, 0.6)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "1";
                (e.currentTarget as HTMLElement).style.boxShadow = loading ? "none" : "0 4px 24px rgba(124, 58, 237, 0.45)";
              }}
            >
              {loading
                ? "Generating…"
                : rateLimit?.kind === "user" && rateLimit.remaining === 0
                  ? "Buy credits →"
                  : rateLimit?.kind === "guest" && rateLimit.remaining === 0
                    ? "Sign up to continue →"
                    : "Generate Reel →"}
            </button>
          </div>

          {/* Social proof line */}
          <p style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "#4b5563", letterSpacing: "0.01em" }}>
            🚀 3 free reels to get started · No credit card required
          </p>

          <RegisterBonusModal open={registerModalOpen} onClose={() => setRegisterModalOpen(false)} />
          <GeneratingStatus active={loading} />

          {error && (
            <p
              style={{
                marginTop: "1rem",
                color: "#f87171",
                fontSize: "0.9rem",
                maxWidth: "28rem",
                lineHeight: 1.5,
              }}
            >
              {error}
            </p>
          )}

          {/* Video result */}
          {status === "completed" && videoUrl && (
            <div
              style={{
                marginTop: "2.5rem",
                width: "100%",
                maxWidth: "380px",
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
                  borderRadius: "1rem",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
                }}
              />
              <a
                href={videoUrl}
                download="reel.mp4"
                onClick={() => posthog.capture("reel_downloaded", { niche, job_id: jobId })}
                style={{
                  width: "100%",
                  textAlign: "center",
                  padding: "0.8rem 1.5rem",
                  background: "linear-gradient(90deg, #10b981, #059669)",
                  color: "#fff",
                  borderRadius: "0.75rem",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
                }}
              >
                Download Reel
              </a>

              {/* TikTok section */}
              <div
                style={{
                  width: "100%",
                  padding: "1.25rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#f472b6",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "0.75rem",
                  }}
                >
                  TikTok
                </p>

                {tiktokConfigured === null ? (
                  <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>Loading TikTok options…</p>
                ) : !tiktokConfigured ? (
                  <p style={{ fontSize: "0.82rem", color: "#6b7280", lineHeight: 1.6 }}>
                    Posting to TikTok is not enabled yet. Add{" "}
                    <code style={{ color: "#d1d5db", fontSize: "0.78rem" }}>TIKTOK_CLIENT_KEY</code>,{" "}
                    <code style={{ color: "#d1d5db", fontSize: "0.78rem" }}>TIKTOK_CLIENT_SECRET</code>, and{" "}
                    <code style={{ color: "#d1d5db", fontSize: "0.78rem" }}>TIKTOK_REDIRECT_URI</code> to your{" "}
                    <code style={{ color: "#d1d5db", fontSize: "0.78rem" }}>.env</code> and restart. See{" "}
                    <code style={{ color: "#d1d5db", fontSize: "0.78rem" }}>TIKTOK_SETUP.md</code>.
                  </p>
                ) : (
                  <>
                    {tiktokConnected ? (
                      <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                        Connected as{" "}
                        <span style={{ color: "#e8e8e8", fontWeight: 600 }}>{tiktokDisplayName || "TikTok"}</span>
                      </p>
                    ) : (
                      <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
                        Post this reel directly to TikTok.
                      </p>
                    )}

                    {!tiktokConnected ? (
                      <a
                        href="/api/tiktok/auth"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.6rem 1.25rem",
                          background: "#fe2c55",
                          color: "#fff",
                          borderRadius: "0.5rem",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          boxShadow: "0 4px 16px rgba(254,44,85,0.35)",
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
                          padding: "0.6rem 1.25rem",
                          background: tiktokPublishing ? "rgba(255,255,255,0.06)" : "#fe2c55",
                          color: tiktokPublishing ? "#6b7280" : "#fff",
                          border: "none",
                          borderRadius: "0.5rem",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          cursor: tiktokPublishing ? "not-allowed" : "pointer",
                        }}
                      >
                        {tiktokPublishing ? "Posting…" : "Post to TikTok"}
                      </button>
                    )}

                    {tiktokPublishError && (
                      <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#f87171" }}>
                        {tiktokPublishError}
                      </p>
                    )}
                    {tiktokShareUrl && (
                      <p style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
                        <a href={tiktokShareUrl} style={{ color: "#a78bfa" }} rel="noopener noreferrer">
                          Open TikTok link →
                        </a>
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── Niche ticker ── */}
        <div
          style={{
            width: "100%",
            overflow: "hidden",
            padding: "1.25rem 0",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            background: "rgba(255,255,255,0.015)",
            marginBottom: "4rem",
          }}
        >
          <div
            className="niche-ticker"
            style={{
              display: "flex",
              gap: "0",
              width: "max-content",
            }}
          >
            {[...NICHE_TAGS, ...NICHE_TAGS].map((tag, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.35rem 1.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                  borderRight: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ── Features Section ── */}
        <section
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            padding: "0 clamp(1rem, 4vw, 2rem) clamp(4rem, 8vw, 6rem)",
            width: "100%",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: "0.75rem",
              }}
            >
              Telling Stories has never been{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                this easy
              </span>
            </h2>
            <p style={{ fontSize: "1.05rem", color: "#6b7280", maxWidth: "460px", margin: "0 auto", lineHeight: 1.6 }}>
              From writing script to creating video with voiceover and captions — ReelGen does it all.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {FEATURE_CARDS.map((card) => (
              <div
                key={card.title}
                className="card-hover"
                style={{
                  padding: "1.75rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.025)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "0.75rem",
                    background: "rgba(124, 58, 237, 0.15)",
                    border: "1px solid rgba(124, 58, 237, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.35rem",
                    marginBottom: "1.1rem",
                  }}
                >
                  {card.icon}
                </div>
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: "#f1f5f9",
                    marginBottom: "0.5rem",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {card.title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.65 }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA banner — only shown to guests ── */}
        {rateLimit?.kind !== "user" && <section
          style={{
            maxWidth: "72rem",
            margin: "0 auto clamp(4rem, 8vw, 6rem)",
            padding: "0 clamp(1rem, 4vw, 2rem)",
            width: "100%",
          }}
        >
          <div
            style={{
              padding: "clamp(2rem, 5vw, 3.5rem)",
              borderRadius: "1.5rem",
              background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(37,99,235,0.12) 100%)",
              border: "1px solid rgba(124, 58, 237, 0.25)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 65%)",
                pointerEvents: "none",
              }}
            />
            <h2
              style={{
                fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: "0.75rem",
                position: "relative",
              }}
            >
              Start creating viral reels today 👋
            </h2>
            <p
              style={{
                fontSize: "1rem",
                color: "#9ca3af",
                maxWidth: "400px",
                margin: "0 auto 1.75rem",
                lineHeight: 1.6,
                position: "relative",
              }}
            >
              Get started with ReelGen today and create engaging reels for TikTok and YouTube on autopilot.
            </p>
            <Link
              href="/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.85rem 2rem",
                borderRadius: "0.75rem",
                background: "linear-gradient(90deg, #7c3aed, #2563eb)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1rem",
                boxShadow: "0 4px 24px rgba(124,58,237,0.45)",
                position: "relative",
              }}
            >
              Get Started Free →
            </Link>
          </div>
        </section>}
      </main>
    </>
  );
}
