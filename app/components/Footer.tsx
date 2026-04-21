"use client";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        width: "100%",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        background: "rgba(255,255,255,0.01)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "3rem clamp(1rem, 4vw, 2rem) 2rem",
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "2.5rem",
            marginBottom: "3rem",
          }}
        >
          {/* Brand column */}
          <div style={{ gridColumn: "span 1" }}>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.02em",
                marginBottom: "0.75rem",
              }}
            >
              ReelGen
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#4b5563",
                lineHeight: 1.65,
                maxWidth: "220px",
              }}
            >
              AI-powered faceless reels for TikTok &amp; YouTube — on autopilot.
            </p>
          </div>

          {/* Product column */}
          <div>
            <h4
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "1rem",
              }}
            >
              Product
            </h4>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[
                { href: "/", label: "Home" },
                { href: "/buy-credits", label: "Pricing" },
                { href: "/blog", label: "Blog" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: "0.875rem",
                    color: "#4b5563",
                    transition: "color 0.2s",
                    width: "fit-content",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#d1d5db"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#4b5563"; }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Niches column */}
          <div>
            <h4
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "1rem",
              }}
            >
              Niches
            </h4>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[
                { href: "/reels/financial", label: "Finance Reels" },
                { href: "/reels/crypto", label: "Crypto Reels" },
                { href: "/reels/news", label: "News Reels" },
                { href: "/reels/sports", label: "Sports Reels" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: "0.875rem",
                    color: "#4b5563",
                    transition: "color 0.2s",
                    width: "fit-content",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#d1d5db"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#4b5563"; }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Legal column */}
          <div>
            <h4
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "1rem",
              }}
            >
              Legal
            </h4>
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[
                { href: "/terms", label: "Terms of Service" },
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/contact", label: "Contact Us" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: "0.875rem",
                    color: "#4b5563",
                    transition: "color 0.2s",
                    width: "fit-content",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#d1d5db"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#4b5563"; }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p style={{ color: "#374151", fontSize: "0.8rem" }}>
            © {year} ReelGen. All rights reserved.
          </p>
          <p style={{ color: "#374151", fontSize: "0.8rem" }}>
            Generate AI financial news reels in seconds.
          </p>
        </div>
      </div>
    </footer>
  );
}
