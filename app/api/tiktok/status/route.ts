import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureValidAccessToken, fetchUserInfoBasic } from "@/lib/tiktok/api";
import {
  TIKTOK_TOKEN_COOKIE,
  parseTokenCookie,
  serializeTokenCookie,
  tokenCookieOptions,
  getSessionSecret,
} from "@/lib/tiktok/webSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    getSessionSecret();
  } catch {
    return NextResponse.json({ connected: false, configured: false });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return NextResponse.json({ connected: false, configured: false });
  }

  const cookieStore = cookies();
  const raw = cookieStore.get(TIKTOK_TOKEN_COOKIE)?.value;
  const token = parseTokenCookie(raw);
  if (!token?.access_token) {
    return NextResponse.json({ connected: false, configured: true });
  }

  try {
    const session = await ensureValidAccessToken(
      token,
      clientKey,
      clientSecret
    );
    const user = await fetchUserInfoBasic(session.access_token);

    const res = NextResponse.json({
      connected: true,
      configured: true,
      displayName: user.display_name ?? undefined,
    });

    if (
      session.access_token !== token.access_token ||
      session.refresh_token !== token.refresh_token
    ) {
      res.cookies.set(
        TIKTOK_TOKEN_COOKIE,
        serializeTokenCookie(session),
        tokenCookieOptions
      );
    }

    return res;
  } catch {
    return NextResponse.json({
      connected: false,
      configured: true,
      stale: true,
    });
  }
}
