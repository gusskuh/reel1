import { Redis } from "@upstash/redis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeClientIp } from "@/lib/rateLimit";
import { GUEST_REEL_CAP, USER_SIGNUP_REEL_CREDITS } from "@/lib/reelQuotaConstants";

export { GUEST_REEL_CAP, USER_SIGNUP_REEL_CREDITS } from "@/lib/reelQuotaConstants";

const GUEST_KEY = (ip: string) =>
  `reelgen:guest_lifetime:${normalizeClientIp(ip)}`;

function useRedis(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

const globalRedis = globalThis as unknown as { __reelgenQuotaRedis?: Redis };
function getRedis(): Redis | null {
  if (!useRedis()) return null;
  if (!globalRedis.__reelgenQuotaRedis) {
    globalRedis.__reelgenQuotaRedis = Redis.fromEnv();
  }
  return globalRedis.__reelgenQuotaRedis;
}

const globalGuest = globalThis as unknown as {
  guestLifetimeCounts?: Map<string, number>;
};
function guestMemoryMap(): Map<string, number> {
  if (!globalGuest.guestLifetimeCounts) {
    globalGuest.guestLifetimeCounts = new Map();
  }
  return globalGuest.guestLifetimeCounts;
}

export async function getGuestReelUsed(ip: string): Promise<number> {
  const key = GUEST_KEY(ip);
  const r = getRedis();
  if (r) {
    const v = await r.get<number>(key);
    return typeof v === "number" ? v : 0;
  }
  return guestMemoryMap().get(key) ?? 0;
}

/** Reserve one guest slot; rolls back if over cap. */
function buildUserSnapshot(creditsRaw: unknown): ReelQuotaSnapshot {
  const n = Math.trunc(Number(creditsRaw));
  const credits = Number.isFinite(n) && n >= 0 ? n : 0;
  const limit = Math.max(USER_SIGNUP_REEL_CREDITS, credits);
  return {
    used: limit - credits,
    remaining: credits,
    limit,
    resetAt: null,
    kind: "user",
  };
}

/** Authoritative credits for signed-in users (matches consume path; bypasses RLS quirks). */
export async function getUserReelQuotaWithAdmin(
  admin: SupabaseClient,
  userId: string
): Promise<ReelQuotaSnapshot> {
  const { data: row, error } = await admin
    .from("profiles")
    .select("reel_credits")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("getUserReelQuotaWithAdmin:", error.message, error.code);
  }
  if (!row || row.reel_credits == null) {
    return buildUserSnapshot(USER_SIGNUP_REEL_CREDITS);
  }
  return buildUserSnapshot(row.reel_credits);
}

export async function tryConsumeGuestReel(ip: string): Promise<{ ok: boolean }> {
  const key = GUEST_KEY(ip);
  const r = getRedis();
  if (r) {
    const n = await r.incr(key);
    if (n > GUEST_REEL_CAP) {
      await r.decr(key);
      return { ok: false };
    }
    return { ok: true };
  }
  const m = guestMemoryMap();
  const cur = m.get(key) ?? 0;
  if (cur >= GUEST_REEL_CAP) return { ok: false };
  m.set(key, cur + 1);
  return { ok: true };
}

/** Ensures a profile row exists (signup trigger or legacy user), then decrements if > 0. */
export async function tryConsumeUserReelCredit(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: boolean; remaining: number }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    let { data: row, error: selErr } = await admin
      .from("profiles")
      .select("reel_credits")
      .eq("id", userId)
      .maybeSingle();

    if (selErr) {
      console.error("tryConsumeUserReelCredit select:", selErr.message, selErr.code);
      return { ok: false, remaining: 0 };
    }

    if (!row) {
      const { error: insErr } = await admin.from("profiles").insert({
        id: userId,
        reel_credits: USER_SIGNUP_REEL_CREDITS,
      });
      if (insErr?.code === "23505") continue;
      if (insErr) {
        console.error("profiles insert:", insErr.message, insErr.code);
        return { ok: false, remaining: 0 };
      }
      row = { reel_credits: USER_SIGNUP_REEL_CREDITS };
    }

    const cur = Math.trunc(Number(row.reel_credits));
    if (!Number.isFinite(cur) || cur < 1) return { ok: false, remaining: 0 };

    const next = cur - 1;
    const { data: updated, error: upErr } = await admin
      .from("profiles")
      .update({ reel_credits: next })
      .eq("id", userId)
      .eq("reel_credits", cur)
      .select("reel_credits")
      .maybeSingle();

    if (upErr) {
      console.error("profiles update:", upErr.message, upErr.code);
      return { ok: false, remaining: 0 };
    }
    if (updated) return { ok: true, remaining: next };
  }
  return { ok: false, remaining: 0 };
}

export type ReelQuotaSnapshot = {
  used: number;
  remaining: number;
  limit: number;
  resetAt: null;
  kind: "guest" | "user";
};

/**
 * Read quota for UI. Uses the user-scoped Supabase client (RLS) for signed-in users.
 */
export async function getReelQuotaSnapshot(
  ip: string,
  userId: string | null,
  supabase: SupabaseClient | null
): Promise<ReelQuotaSnapshot> {
  if (userId && supabase) {
    const { data: row, error } = await supabase
      .from("profiles")
      .select("reel_credits")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("getReelQuotaSnapshot user read:", error.message, error.code);
    }
    if (!row || row.reel_credits == null) {
      return buildUserSnapshot(USER_SIGNUP_REEL_CREDITS);
    }
    return buildUserSnapshot(row.reel_credits);
  }

  const used = await getGuestReelUsed(ip);
  return {
    used,
    remaining: Math.max(0, GUEST_REEL_CAP - used),
    limit: GUEST_REEL_CAP,
    resetAt: null,
    kind: "guest",
  };
}
