import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, getSiteUrl } from "@/lib/seoConfig";

const desc = "Get in touch with the ReelGen team. We're happy to help with questions, feedback, or support.";

export const metadata: Metadata = {
  title: `Contact Us`,
  description: desc,
  keywords: ["ReelGen contact", "ReelGen support", "contact ReelGen"],
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `Contact Us — ${SITE_NAME}`,
    description: desc,
    url: `${getSiteUrl()}/contact`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Contact Us — ${SITE_NAME}`,
    description: desc,
  },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <>
    <style>{`.contact-btn:hover { opacity: 0.85; }`}</style>
    <main
      style={{
        flex: 1,
        width: "100%",
        maxWidth: "42rem",
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
        lineHeight: 1.6,
      }}
    >
      <p style={{ marginBottom: "1.5rem" }}>
        <Link href="/" style={{ color: "#00d4ff" }}>
          ← Back
        </Link>
      </p>

      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Contact Us</h1>
      <p style={{ color: "#9ca3af", fontSize: "0.95rem", marginBottom: "2.5rem" }}>
        Have a question, found a bug, or just want to say hi? We&apos;d love to hear from you.
      </p>

      {/* Email card */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "0.75rem",
          padding: "1.75rem",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem", color: "#e8e8e8" }}>
          Email Support
        </h2>
        <p style={{ color: "#9ca3af", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Send us an email and we&apos;ll get back to you as soon as possible.
        </p>
        <a
          href="mailto:reelgenz.app@gmail.com"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.9rem",
            padding: "0.65rem 1.25rem",
            borderRadius: "0.5rem",
            textDecoration: "none",
            transition: "opacity 0.2s",
          }}
          className="contact-btn"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          reelgenz.app@gmail.com
        </a>
      </div>

      {/* Response time note */}
      <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>
        We typically respond within 1–2 business days.
      </p>
    </main>
    </>
  );
}
