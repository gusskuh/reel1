/**
 * Public origin for redirects (Stripe success/cancel). Prefer NEXT_PUBLIC_APP_URL in production.
 */
export function getAppOriginFromRequest(req: Request): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return null;

  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}
