"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import posthog from "posthog-js";
import { AuthCard, authFieldStyles } from "@/app/components/AuthCard";
import { getAuthRedirectOrigin } from "@/lib/authRedirectOrigin";
import { createClient } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { error: oAuthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getAuthRedirectOrigin()}/auth/callback`,
      },
    });
    setLoading(false);
    if (oAuthError) setError(oAuthError.message);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getAuthRedirectOrigin()}/auth/callback`,
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.user) {
      posthog.identify(data.user.id, { email: data.user.email });
      posthog.capture("user_signed_up", { method: "email" });
    }
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setInfo("Check your email for a confirmation link, then log in.");
  }

  return (
    <AuthCard title="Create account" subtitle="Email and password, or Google.">
      {info && (
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
          {info}
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
          <label htmlFor="register-email" style={authFieldStyles.label}>
            Email
          </label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" style={authFieldStyles.label}>
            Password
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={authFieldStyles.input}
          />
        </div>
        <div>
          <label htmlFor="register-confirm" style={authFieldStyles.label}>
            Confirm password
          </label>
          <input
            id="register-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={authFieldStyles.input}
          />
        </div>
        <button type="submit" disabled={loading} style={authFieldStyles.primaryBtn}>
          {loading ? "…" : "Sign up"}
        </button>
      </form>
      <div style={{ margin: "1rem 0", textAlign: "center", color: "rgba(232,232,232,0.45)", fontSize: "0.85rem" }}>
        or
      </div>
      <button type="button" disabled={loading} onClick={signInWithGoogle} style={authFieldStyles.secondaryBtn}>
        Continue with Google
      </button>
      <p style={{ margin: "1.25rem 0 0", textAlign: "center" }}>
        <Link href="/login" style={authFieldStyles.link}>
          Already have an account? Log in
        </Link>
      </p>
    </AuthCard>
  );
}
