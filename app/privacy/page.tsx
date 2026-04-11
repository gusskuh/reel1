import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, getSiteUrl } from "@/lib/seoConfig";

const desc = "How ReelGen collects, uses, and protects your data when you generate AI reels.";

export const metadata: Metadata = {
  title: `Privacy Policy`,
  description: desc,
  keywords: ["ReelGen privacy", "AI reel generator privacy"],
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `Privacy Policy — ${SITE_NAME}`,
    description: desc,
    url: `${getSiteUrl()}/privacy`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Privacy Policy — ${SITE_NAME}`,
    description: desc,
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
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
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Privacy Policy</h1>
      <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginBottom: "2rem" }}>
        Last updated: March 27, 2026
      </p>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>1. What this covers</h2>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          This policy describes how ReelGen (“we”) handles information when you use our web
          application. It applies to the site where ReelGen is deployed.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>2. Information we process</h2>
        <ul
          style={{
            color: "#d1d5db",
            fontSize: "0.95rem",
            paddingLeft: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <li>
            <strong style={{ color: "#e8e8e8" }}>Generation requests:</strong> options you choose
            (e.g. niche, voice) and identifiers needed to run your job on our servers.
          </li>
          <li>
            <strong style={{ color: "#e8e8e8" }}>OAuth tokens (optional):</strong> if you connect
            TikTok, we store tokens in an encrypted session cookie so you can post videos. We do not
            sell this data.
          </li>
          <li>
            <strong style={{ color: "#e8e8e8" }}>Technical data:</strong> standard server logs (e.g.
            IP, user agent) may be kept for security and debugging, depending on hosting.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>3. Third parties</h2>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          We use providers such as AI, media, and hosting services to operate ReelGen. TikTok
          processes data according to its policies when you use TikTok login or posting. Review their
          privacy notices for details.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>4. Retention</h2>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          Generated files and job data may be kept only as long as needed for the service or as
          required by law. OAuth cookies expire after a limited period or when you clear cookies.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>5. Your choices</h2>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          You can disconnect TikTok by clearing site cookies or revoking the app in your TikTok
          account settings. You may contact us through the site where ReelGen is hosted for privacy
          requests, subject to applicable law.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>6. Changes</h2>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          We may update this policy; the “Last updated” date will change. Continued use after changes
          means you accept the updated policy.
        </p>
      </section>

      <p
        style={{
          marginTop: "2rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: "0.8rem",
          color: "#6b7280",
        }}
      >
        This page is a general template and is not legal advice. Adapt it for your jurisdiction and
        have it reviewed for a production product.
      </p>
    </main>
  );
}
