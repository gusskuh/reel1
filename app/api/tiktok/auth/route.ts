import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const runtime = "nodejs";
import { TIKTOK_AUTH_URL, TIKTOK_SCOPES } from "@/lib/tiktok/constants";
import {
  TIKTOK_OAUTH_STATE_COOKIE,
  stateCookieOptions,
} from "@/lib/tiktok/webSession";

export async function GET(req: Request) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json(
      { error: "TikTok is not configured (TIKTOK_CLIENT_KEY missing)." },
      { status: 501 }
    );
  }

  const origin = new URL(req.url).origin;
  const redirectUri =
    process.env.TIKTOK_REDIRECT_URI || `${origin}/api/tiktok/callback`;

  const state = randomBytes(24).toString("hex");
  const auth = new URL(TIKTOK_AUTH_URL);
  auth.searchParams.set("client_key", clientKey);
  auth.searchParams.set("scope", TIKTOK_SCOPES);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("state", state);

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, state, stateCookieOptions);
  return res;
}
