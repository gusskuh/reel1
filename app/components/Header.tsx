"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import RateLimitDots from "./RateLimitDots";

const MENU_LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
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

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const signOut = useCallback(async () => {
    if (!supabaseOk) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    closeMenu();
    router.refresh();
  }, [closeMenu, router, supabaseOk]);

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
        padding: "1rem clamp(0.65rem, 3.5vw, 2rem)",
        background: "rgba(15, 15, 35, 0.8)",
        backdropFilter: "blur(12px)",
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
        <Link
          href="/"
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            flexShrink: 0,
          }}
        >
          ReelGen
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.35rem, 2vw, 0.75rem)",
            minWidth: 0,
            flexShrink: 1,
            justifyContent: "flex-end",
          }}
        >
          <RateLimitDots />

          {supabaseOk && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                minWidth: 0,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {user ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.3rem 0.75rem 0.3rem 0.35rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    background: "rgba(34, 197, 94, 0.12)",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#0a0a12",
                      background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
                    }}
                  >
                    {userInitial(user)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "rgba(134, 239, 172, 0.95)",
                      paddingRight: "0.15rem",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#4ade80",
                        boxShadow: "0 0 6px rgba(74, 222, 128, 0.7)",
                        flexShrink: 0,
                      }}
                    />
                    Signed in
                  </div>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      padding: "0.4rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid rgba(255,255,255,0.22)",
                      color: "#e8e8e8",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      padding: "0.4rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "none",
                      color: "#0a0a12",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
                    }}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          )}

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
                width: 40,
                height: 40,
                padding: 0,
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "0.375rem",
                background: menuOpen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                color: "#e8e8e8",
                cursor: "pointer",
              }}
            >
              <span style={srOnly}>Menu</span>
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden
              >
                {menuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </>
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
                  top: "calc(100% + 0.5rem)",
                  minWidth: "11rem",
                  padding: "0.35rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(22, 22, 45, 0.98)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                  backdropFilter: "blur(12px)",
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
                      padding: "0.65rem 0.85rem",
                      borderRadius: "0.35rem",
                      color: "#e8e8e8",
                      fontSize: "0.9rem",
                      textDecoration: "none",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
                {supabaseOk && !user && (
                  <>
                    <Link
                      href="/login"
                      role="menuitem"
                      onClick={closeMenu}
                      style={{
                        display: "block",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "0.35rem",
                        color: "#e8e8e8",
                        fontSize: "0.9rem",
                        textDecoration: "none",
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
                        padding: "0.65rem 0.85rem",
                        borderRadius: "0.35rem",
                        color: "#e8e8e8",
                        fontSize: "0.9rem",
                        textDecoration: "none",
                      }}
                    >
                      Sign up
                    </Link>
                  </>
                )}
                {supabaseOk && user && (
                  <>
                    <div
                      role="presentation"
                      style={{
                        padding: "0.5rem 0.85rem 0.25rem",
                        fontSize: "0.75rem",
                        color: "rgba(232,232,232,0.5)",
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
                        padding: "0.65rem 0.85rem",
                        borderRadius: "0.35rem",
                        border: "none",
                        background: "transparent",
                        color: "#fca5a5",
                        fontSize: "0.9rem",
                        cursor: "pointer",
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
