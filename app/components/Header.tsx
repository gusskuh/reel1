"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useRateLimit } from "./RateLimitContext";
import RateLimitDots from "./RateLimitDots";

const NAV_LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/buy-credits", label: "Pricing" },
] as const;

const MENU_LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/buy-credits", label: "Pricing" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
] as const;

const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
};

function userInitial(user: User): string {
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  const fromName = meta?.full_name?.trim() || meta?.name?.trim();
  if (fromName) return fromName[0]!.toUpperCase();
  const email = user.email?.trim();
  if (email) return email[0]!.toUpperCase();
  return "?";
}

export default function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const supabaseOk = isSupabaseConfigured();
  const { refresh: refreshRateLimit } = useRateLimit();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const signOut = useCallback(async () => {
    if (!supabaseOk) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    closeMenu();
    await refreshRateLimit();
    router.refresh();
  }, [closeMenu, refreshRateLimit, router, supabaseOk]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!supabaseOk) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabaseOk]);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        padding: "0.9rem clamp(1rem, 4vw, 2.5rem)",
        background: "rgba(8, 8, 15, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <nav
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontSize: "1.3rem",
            fontWeight: 800,
            background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            flexShrink: 0,
            letterSpacing: "-0.02em",
          }}
        >
          ReelGen
        </Link>

        {/* Desktop inline nav links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link-hover"
              style={{
                fontSize: "0.9rem",
                fontWeight: 500,
                color: "#9ca3af",
                padding: "0.4rem 0.75rem",
                borderRadius: "0.375rem",
                display: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ffffff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
            >
              {link.label}
            </Link>
          ))}
          {/* Show inline nav on wider screens via style tag approach */}
          <style>{`
            @media (min-width: 640px) {
              .desktop-nav-link { display: block !important; }
            }
          `}</style>
          {NAV_LINKS.map((link) => (
            <Link
              key={`d-${link.href}`}
              href={link.href}
              className="desktop-nav-link"
              style={{
                fontSize: "0.9rem",
                fontWeight: 500,
                color: "#9ca3af",
                padding: "0.4rem 0.75rem",
                borderRadius: "0.375rem",
                display: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ffffff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          <RateLimitDots />

          {supabaseOk && (
            <>
              {user ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.3rem 0.75rem 0.3rem 0.35rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(167, 139, 250, 0.3)",
                    background: "rgba(167, 139, 250, 0.08)",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#ffffff",
                      background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                    }}
                  >
                    {userInitial(user)}
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#c4b5fd",
                    }}
                  >
                    {user.email?.split("@")[0]}
                  </span>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      padding: "0.45rem 0.9rem",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#d1d5db",
                      whiteSpace: "nowrap",
                      transition: "border-color 0.2s, color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.35)";
                      (e.currentTarget as HTMLElement).style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
                      (e.currentTarget as HTMLElement).style.color = "#d1d5db";
                    }}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      padding: "0.45rem 0.9rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      color: "#ffffff",
                      whiteSpace: "nowrap",
                      background: "linear-gradient(90deg, #7c3aed, #2563eb)",
                      boxShadow: "0 2px 12px rgba(124, 58, 237, 0.4)",
                      transition: "opacity 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = "0.9";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(124, 58, 237, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = "1";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(124, 58, 237, 0.4)";
                    }}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </>
          )}

          {/* Hamburger menu */}
          <div ref={wrapRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-controls={menuId}
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                padding: 0,
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "0.5rem",
                background: menuOpen ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                color: "#d1d5db",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <span style={srOnly}>Menu</span>
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                aria-hidden
              >
                {menuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {menuOpen && (
              <div
                id={menuId}
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 0.6rem)",
                  minWidth: "12rem",
                  padding: "0.4rem",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(14, 14, 26, 0.98)",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)",
                  backdropFilter: "blur(16px)",
                }}
              >
                {MENU_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={closeMenu}
                    style={{
                      display: "block",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "0.4rem",
                      color: "#d1d5db",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.12)";
                      (e.currentTarget as HTMLElement).style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#d1d5db";
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
                {supabaseOk && !user && (
                  <>
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0.3rem 0.5rem" }} />
                    <Link
                      href="/login"
                      role="menuitem"
                      onClick={closeMenu}
                      style={{
                        display: "block",
                        padding: "0.6rem 0.85rem",
                        borderRadius: "0.4rem",
                        color: "#d1d5db",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                        (e.currentTarget as HTMLElement).style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#d1d5db";
                      }}
                    >
                      Log in
                    </Link>
                    <Link
                      href="/register"
                      role="menuitem"
                      onClick={closeMenu}
                      style={{
                        display: "block",
                        margin: "0.3rem 0",
                        padding: "0.6rem 0.85rem",
                        borderRadius: "0.4rem",
                        color: "#fff",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        background: "linear-gradient(90deg, #7c3aed, #2563eb)",
                      }}
                    >
                      Get Started
                    </Link>
                  </>
                )}
                {supabaseOk && user && (
                  <>
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0.3rem 0.5rem" }} />
                    <div
                      role="presentation"
                      style={{
                        padding: "0.5rem 0.85rem 0.3rem",
                        fontSize: "0.75rem",
                        color: "rgba(232,232,232,0.4)",
                        wordBreak: "break-all",
                      }}
                    >
                      {user.email}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void signOut()}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "0.6rem 0.85rem",
                        borderRadius: "0.4rem",
                        border: "none",
                        background: "transparent",
                        color: "#fca5a5",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Log out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
