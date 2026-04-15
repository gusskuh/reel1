"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, authFieldStyles } from "@/app/components/AuthCard";
import { getAuthRedirectOrigin } from "@/lib/authRedirectOrigin";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialError?: string;
  registered?: boolean;
  /** Post-login path (internal only), e.g. /buy-credits */
  next?: string;
};

function safeNextPath(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export function LoginForm({ initialError, registered, next }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    initialError === "auth"
      ? "Sign-in failed. Try again or use another method."
      : initialError === "config"
        ? "Auth is not configured (missing Supabase env vars)."
        : initialError
          ? "Something went wrong."
          : null
  );
  const [loading, setLoading] = useState(false);
  const afterLogin = safeNextPath(next);

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: oAuthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getAuthRedirectOrigin()}/auth/callback?next=${encodeURIComponent(afterLogin)}`,
      },
    });
    setLoading(false);
    if (oAuthError) setError(oAuthError.message);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.push(afterLogin);
    router.refresh();
  }

  return (
    <AuthCard title="Log in" subtitle="Use your email or Google.">
      {registered && (
        <p
          style={{
            margin: "0 0 1rem",
            padding: "0.65rem 0.75rem",
            borderRadius: "0.375rem",
            background: "rgba(34, 197, 94, 0.15)",
            border: "1px solid rgba(34, 197, 94, 0.35)",
            color: "#86efac",
            fontSize: "0.9rem",
          }}
        >
          Account created. You can sign in now (or confirm your email first if your project requires it).
        </p>
      )}
      {error && (
        <p
          style={{
            margin: "0 0 1rem",
            padding: "0.65rem 0.75rem",
            borderRadius: "0.375rem",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#fecaca",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </p>
      )}
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label htmlFor="login-email" style={authFieldStyles.label}>
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={authFieldStyles.input}
          />
        </div>
        <div>
          <label htmlFor="login-password" style={authFieldStyles.label}>
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={authFieldStyles.input}
          />
        </div>
        <button type="submit" disabled={loading} style={authFieldStyles.primaryBtn}>
          {loading ? "…" : "Log in"}
        </button>
      </form>
      <div style={{ margin: "1rem 0", textAlign: "center", color: "rgba(232,232,232,0.45)", fontSize: "0.85rem" }}>
        or
      </div>
      <button type="button" disabled={loading} onClick={signInWithGoogle} style={authFieldStyles.secondaryBtn}>
        Continue with Google
      </button>
      <p style={{ margin: "1.25rem 0 0", textAlign: "center" }}>
        <Link href="/register" style={authFieldStyles.link}>
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
