import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — ReelGen",
  description: "Terms of Service for ReelGen",
};

export default function TermsPage() {
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
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Terms of Service</h1>
      <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginBottom: "2rem" }}>
        Last updated: March 27, 2026
      </p>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>1. Service</h2>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          ReelGen (“we”, “us”) provides a tool to generate short video reels from user-selected options
          and third-party content sources. The service is offered as-is and may change or stop at any
          time.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>2. Your account and use</h2>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          You agree to use ReelGen only for lawful purposes. You are responsible for content you
          generate, download, or publish using third-party platforms (for example TikTok). You must
          comply with those platforms’ terms and policies.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>3. Third-party services</h2>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          Optional features may connect to third-party APIs (e.g. TikTok OAuth for posting). Those
          services have their own terms; your use of them is between you and the provider.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>4. Disclaimer</h2>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          ReelGen is provided “as is” without warranties of any kind. We are not liable for indirect
          or consequential damages arising from your use of the service, to the maximum extent allowed
          by law.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>5. Contact</h2>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          For questions about these terms, use the contact method published on the website where
          ReelGen is hosted.
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
        This page is a general template and is not legal advice. Have it reviewed if you rely on it
        for a production product.
      </p>
    </main>
  );
}
