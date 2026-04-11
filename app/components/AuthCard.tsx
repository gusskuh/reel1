"use client";

import type { CSSProperties, ReactNode } from "react";

const card: CSSProperties = {
  width: "100%",
  maxWidth: "22rem",
  padding: "2rem",
  borderRadius: "0.75rem",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  background: "rgba(22, 22, 45, 0.95)",
  boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
};

const label: CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  color: "rgba(232, 232, 232, 0.85)",
  marginBottom: "0.35rem",
};

const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "0.65rem 0.75rem",
  borderRadius: "0.375rem",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(15, 15, 35, 0.8)",
  color: "#e8e8e8",
  fontSize: "1rem",
};

const primaryBtn: CSSProperties = {
  width: "100%",
  padding: "0.7rem 1rem",
  borderRadius: "0.375rem",
  border: "none",
  background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
  color: "#0a0a12",
  fontWeight: 600,
  fontSize: "0.95rem",
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  width: "100%",
  padding: "0.7rem 1rem",
  borderRadius: "0.375rem",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.06)",
  color: "#e8e8e8",
  fontWeight: 500,
  fontSize: "0.95rem",
  cursor: "pointer",
};

const link: CSSProperties = {
  color: "#7dd3fc",
  textDecoration: "none",
  fontSize: "0.9rem",
};

export const authFieldStyles = { label, input, primaryBtn, secondaryBtn, link };

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div style={card}>
        <h1
          style={{
            margin: "0 0 0.35rem",
            fontSize: "1.35rem",
            fontWeight: 700,
            color: "#f4f4f5",
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", color: "rgba(232,232,232,0.7)" }}>
            {subtitle}
          </p>
        ) : (
          <div style={{ marginBottom: "1.25rem" }} />
        )}
        {children}
      </div>
    </main>
  );
}
