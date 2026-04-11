import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_STUBS } from "@/lib/blogStubs";
import { SITE_NAME, getSiteUrl } from "@/lib/seoConfig";

const desc =
  "Short guides on AI reel generators, stock news reels, Instagram and YouTube Shorts workflows, and faceless TikTok content.";

export const metadata: Metadata = {
  title: "Blog — guides for AI reels & short-form video",
  description: desc,
  keywords: [
    "AI reel generator guide",
    "stock news reels",
    "YouTube Shorts workflow",
    "faceless TikTok",
    "Instagram Reels tips",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `Blog — ${SITE_NAME}`,
    description: desc,
    url: `${getSiteUrl()}/blog`,
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `Blog — ${SITE_NAME}`,
    description: desc,
    images: [`${getSiteUrl()}/og.svg`],
  },
  robots: { index: true, follow: true },
};

export default function BlogIndexPage() {
  return (
    <main
      style={{
        flex: 1,
        width: "100%",
        maxWidth: "48rem",
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
      }}
    >
      <p style={{ marginBottom: "1.5rem" }}>
        <Link href="/" style={{ color: "#00d4ff" }}>
          ← Home
        </Link>
      </p>

      <h1
        style={{
          fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
          fontWeight: 700,
          marginBottom: "0.75rem",
          background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Blog
      </h1>
      <p style={{ color: "#9ca3af", marginBottom: "2.5rem", maxWidth: "36rem" }}>
        Practical stubs you can expand later—each targets a keyword cluster from short-form and AI
        reel search intent.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {BLOG_STUBS.map((post) => (
          <li
            key={post.slug}
            style={{
              marginBottom: "1.5rem",
              paddingBottom: "1.5rem",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Link
              href={`/blog/${post.slug}`}
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "#e8e8e8",
                textDecoration: "none",
              }}
            >
              {post.title}
            </Link>
            <p style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "0.35rem" }}>
              {post.leadKeyword}
            </p>
            <p style={{ color: "#9ca3af", fontSize: "0.9rem", marginTop: "0.5rem" }}>
              {post.description}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
