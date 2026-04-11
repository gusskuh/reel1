import { NextResponse } from "next/server";
import { getReelQuotaSnapshot, getUserReelQuotaWithAdmin } from "@/lib/reelQuota";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = getServiceRoleClient();
    if (admin) {
      const snapshot = await getUserReelQuotaWithAdmin(admin, user.id);
      return NextResponse.json(snapshot);
    }
  }

  const snapshot = await getReelQuotaSnapshot(ip, user?.id ?? null, supabase);
  return NextResponse.json(snapshot);
}
