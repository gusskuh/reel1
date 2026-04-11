"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GUEST_REEL_CAP, USER_SIGNUP_REEL_CREDITS } from "@/lib/reelQuotaConstants";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function RegisterBonusModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-bonus-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "24rem",
          padding: "1.75rem",
          borderRadius: "0.75rem",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: "rgba(22, 22, 45, 0.98)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        }}
      >
        <h2
          id="register-bonus-title"
          style={{
            margin: "0 0 0.75rem",
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#f4f4f5",
            lineHeight: 1.3,
          }}
        >
          You’ve used your {GUEST_REEL_CAP} free guest reels
        </h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.95rem", color: "rgba(232,232, 232, 0.82)", lineHeight: 1.55 }}>
          Create a free account to unlock{" "}
          <strong style={{ color: "#7dd3fc" }}>{USER_SIGNUP_REEL_CREDITS} bonus reel credits</strong> you can use
          right away—no payment required.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <Link
            href="/register"
            onClick={onClose}
            style={{
              display: "block",
              textAlign: "center",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              fontWeight: 600,
              fontSize: "1rem",
              background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
              color: "#0a0a12",
              textDecoration: "none",
            }}
          >
            Create free account
          </Link>
          <Link
            href="/login"
            onClick={onClose}
            style={{
              display: "block",
              textAlign: "center",
              padding: "0.65rem 1rem",
              borderRadius: "0.5rem",
              fontWeight: 500,
              fontSize: "0.95rem",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#e8e8e8",
              textDecoration: "none",
            }}
          >
            Already have an account? Log in
          </Link>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: "0.25rem",
              padding: "0.5rem",
              border: "none",
              background: "transparent",
              color: "rgba(232,232,232,0.55)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
