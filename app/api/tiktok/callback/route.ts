import { NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/lib/tiktok/api";

export const runtime = "nodejs";
import {
  TIKTOK_OAUTH_STATE_COOKIE,
  TIKTOK_TOKEN_COOKIE,
  serializeTokenCookie,
  stateCookieOptions,
  tokenCookieOptions,
  getSessionSecret,
} from "@/lib/tiktok/webSession";

function clearStateCookie(res: NextResponse) {
  res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, "", {
    ...stateCookieOptions,
    maxAge: 0,
  });
}

export async function GET(req: Request) {
  try {
    getSessionSecret();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Missing session secret";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const origin = new URL(req.url).origin;

  if (oauthError) {
    const res = NextResponse.redirect(
      `${origin}/?tiktok_error=${encodeURIComponent(oauthError)}`
    );
    clearStateCookie(res);
    return res;
  }

  const cookieHeader = req.headers.get("cookie");
  const match = cookieHeader?.match(
    new RegExp(`${TIKTOK_OAUTH_STATE_COOKIE}=([^;]+)`)
  );
  const storedState = match?.[1]?.trim();

  if (!code || !state || !storedState || state !== storedState) {
    const res = NextResponse.redirect(`${origin}/?tiktok_error=invalid_state`);
    clearStateCookie(res);
    return res;
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri =
    process.env.TIKTOK_REDIRECT_URI || `${origin}/api/tiktok/callback`;

  if (!clientKey || !clientSecret) {
    return NextResponse.json(
      { error: "TikTok client credentials not configured." },
      { status: 501 }
    );
  }

  try {
    const token = await exchangeAuthorizationCode(
      code,
      clientKey,
      clientSecret,
      redirectUri
    );

    const res = NextResponse.redirect(`${origin}/?tiktok=connected`);
    res.cookies.set(
      TIKTOK_TOKEN_COOKIE,
      serializeTokenCookie(token),
      tokenCookieOptions
    );
    clearStateCookie(res);
    return res;
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "token_exchange_failed";
    const res = NextResponse.redirect(
      `${origin}/?tiktok_error=${encodeURIComponent(msg)}`
    );
    clearStateCookie(res);
    return res;
  }
}
