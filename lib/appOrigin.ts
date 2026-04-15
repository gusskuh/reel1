function isDevTunnelHost(host: string): boolean {
  return (
    host.endsWith(".ngrok-free.app") ||
    host.endsWith(".ngrok.io") ||
    host.endsWith(".ngrok.app") ||
    host.endsWith(".loca.lt") ||
    host.endsWith(".trycloudflare.com")
  );
}

/**
 * Public origin for redirects (Stripe success/cancel). Prefer NEXT_PUBLIC_APP_URL in production,
 * but always use the actual request host on localhost or dev tunnels (ngrok, etc.) so Stripe
 * redirects back to the correct host.
 */
export function getAppOriginFromRequest(req: Request): string | null {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  const isLocal =
    host?.startsWith("localhost") ||
    host?.startsWith("127.0.0.1") ||
    host?.startsWith("[::1]");

  const isDev = isLocal || (!!host && isDevTunnelHost(host));

  if (!isDev) {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
    if (fromEnv) return fromEnv;
  }

  if (!host) return null;

  const proto =
    req.headers.get("x-forwarded-proto") ||
    (isLocal ? "http" : "https");

  return `${proto}://${host}`;
}
