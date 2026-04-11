import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_STUBS, getBlogStub } from "@/lib/blogStubs";
import { SITE_NAME, getSiteUrl } from "@/lib/seoConfig";
import JsonLd from "@/app/components/JsonLd";

export function generateStaticParams() {
  return BLOG_STUBS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = getBlogStub(params.slug);
  if (!post) return {};
  const path = `/blog/${post.slug}`;
  const base = getSiteUrl();
  const ogImage = `${base}/og.svg`;

  return {
    title: post.title,
    description: post.description,
    keywords: [...post.keywords],
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_US",
      publishedTime: post.datePublished,
      images: [{ url: "/og.svg", width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

function articleJsonLd(post: NonNullable<ReturnType<typeof getBlogStub>>) {
  const base = getSiteUrl();
  const url = `${base}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.headline,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: SITE_NAME, url: base },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: base,
    },
    keywords: post.keywords.join(", "),
    inLanguage: "en-US",
    wordCount: approximateWordCount(post),
  };
}

function approximateWordCount(post: NonNullable<ReturnType<typeof getBlogStub>>): number {
  const text = [
    ...post.paragraphs,
    ...(post.sections?.flatMap((s) => [s.h2, ...s.paragraphs]) ?? []),
    ...(post.bullets ?? []),
  ].join(" ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogStub(params.slug);
  if (!post) notFound();

  return (
    <>
      <JsonLd data={articleJsonLd(post)} />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "42rem",
          margin: "0 auto",
          padding: "2rem 1.25rem 4rem",
          lineHeight: 1.65,
        }}
      >
        <p style={{ marginBottom: "1.25rem" }}>
          <Link href="/blog" style={{ color: "#00d4ff" }}>
            ← Blog
          </Link>
          <span style={{ color: "#4b5563", margin: "0 0.5rem" }}>·</span>
          <Link href="/" style={{ color: "#00d4ff" }}>
            Generator
          </Link>
        </p>

        <p
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#9ca3af",
            marginBottom: "0.5rem",
          }}
        >
          {post.leadKeyword}
        </p>

        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 700,
            marginBottom: "1rem",
            lineHeight: 1.25,
            background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {post.headline}
        </h1>

        <p style={{ color: "#9ca3af", fontSize: "0.9rem", marginBottom: "2rem" }}>
          {post.description}
        </p>

        {post.paragraphs.map((p, i) => (
          <p key={`intro-${i}`} style={{ color: "#d1d5db", marginBottom: "1.25rem" }}>
            {p}
          </p>
        ))}

        {post.sections.map((section) => (
          <section key={section.h2} style={{ marginBottom: "0.5rem" }}>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#e8e8e8",
                marginTop: "2rem",
                marginBottom: "0.85rem",
                lineHeight: 1.35,
              }}
            >
              {section.h2}
            </h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} style={{ color: "#d1d5db", marginBottom: "1.25rem" }}>
                {p}
              </p>
            ))}
          </section>
        ))}

        {post.bullets && post.bullets.length > 0 && (
          <>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#e8e8e8",
                marginTop: "2rem",
                marginBottom: "0.85rem",
              }}
            >
              Key takeaways
            </h2>
            <ul
              style={{
                color: "#d1d5db",
                marginBottom: "2rem",
                paddingLeft: "1.25rem",
              }}
            >
              {post.bullets.map((b, i) => (
                <li key={i} style={{ marginBottom: "0.5rem" }}>
                  {b}
                </li>
              ))}
            </ul>
          </>
        )}

        {post.relatedLinks && post.relatedLinks.length > 0 && (
          <nav aria-label="Related pages" style={{ marginBottom: "2rem" }}>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#e8e8e8",
                marginBottom: "0.75rem",
              }}
            >
              Related on ReelGen
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {post.relatedLinks.map((link) => (
                <li key={link.href} style={{ marginBottom: "0.5rem" }}>
                  <Link href={link.href} style={{ color: "#00d4ff", fontSize: "0.95rem" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div
          style={{
            marginTop: "2.5rem",
            padding: "1.25rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p style={{ color: "#e8e8e8", fontWeight: 600, marginBottom: "0.75rem" }}>
            Try ReelGen
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.9rem", marginBottom: "1rem" }}>
            Generate a vertical reel from stock headlines or a news category—voice, captions, and
            scenes included.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "0.65rem 1.25rem",
              borderRadius: "0.375rem",
              background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Open generator
          </Link>
        </div>
      </main>
    </>
  );
}
