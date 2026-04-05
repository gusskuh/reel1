import type { TikTokToken } from "./types";
import { sealPayload, openPayload } from "./cookieCrypto";

export const TIKTOK_TOKEN_COOKIE = "tt_session";
export const TIKTOK_OAUTH_STATE_COOKIE = "tt_oauth_state";

const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days
const STATE_COOKIE_MAX_AGE = 600; // 10 min

export function getSessionSecret(): string {
  const s = process.env.TIKTOK_SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "Set TIKTOK_SESSION_SECRET (or SESSION_SECRET) to a random string of at least 16 characters."
    );
  }
  return s;
}

export function serializeTokenCookie(token: TikTokToken): string {
  return sealPayload(JSON.stringify(token), getSessionSecret());
}

export function parseTokenCookie(value: string | undefined): TikTokToken | null {
  if (!value) return null;
  try {
    const json = openPayload(value, getSessionSecret());
    return JSON.parse(json) as TikTokToken;
  } catch {
    return null;
  }
}

export const tokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TOKEN_COOKIE_MAX_AGE,
};

export const stateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: STATE_COOKIE_MAX_AGE,
};
