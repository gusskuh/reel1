export default function Footer() {
  return (
    <footer
      style={{
        width: "100%",
        padding: "2rem",
        marginTop: "auto",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        textAlign: "center",
      }}
    >
      <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
        © {new Date().getFullYear()} ReelGen. Generate AI financial news reels.
      </p>
      <p style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "0.75rem" }}>
        <a href="/blog" style={{ color: "#9ca3af", textDecoration: "underline" }}>
          Blog
        </a>
        <span style={{ margin: "0 0.5rem", color: "#4b5563" }}>·</span>
        <a href="/terms" style={{ color: "#9ca3af", textDecoration: "underline" }}>
          Terms
        </a>
        <span style={{ margin: "0 0.5rem", color: "#4b5563" }}>·</span>
        <a href="/privacy" style={{ color: "#9ca3af", textDecoration: "underline" }}>
          Privacy
        </a>
      </p>
    </footer>
  );
}
