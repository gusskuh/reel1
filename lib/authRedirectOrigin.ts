/**
 * Base URL for Supabase OAuth and email redirects.
 * In production, NEXT_PUBLIC_APP_URL must match your public host (e.g. https://www.reelgenz.app).
 * Localhost and dev tunnels (ngrok, etc.) always use the current browser origin so OAuth returns
 * to the same host; NEXT_PUBLIC_APP_URL would otherwise send tunnels to production.
 */
function isDevTunnelHost(hostname: string): boolean {
  return (
    hostname.endsWith(".ngrok-free.app") ||
    hostname.endsWith(".ngrok.io") ||
    hostname.endsWith(".ngrok.app") ||
    hostname.endsWith(".loca.lt") ||
    hostname.endsWith(".trycloudflare.com")
  );
}

export function getAuthRedirectOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (typeof window === "undefined") {
    return fromEnv ?? "";
  }
  const { hostname, origin } = window.location;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local");
  if (isLocal || isDevTunnelHost(hostname)) return origin;
  if (fromEnv) return fromEnv;
  return origin;
}
