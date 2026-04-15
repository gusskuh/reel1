import { NextResponse } from "next/server";
import { getUserReelQuotaWithAdmin } from "@/lib/reelQuota";
import { getStripe } from "@/lib/stripeServer";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = getServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    console.error("session retrieve:", e);
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 400 });
  }

  const metaUser = session.metadata?.supabase_user_id?.trim();
  if (!metaUser || metaUser !== user.id) {
    return NextResponse.json({ error: "This purchase does not belong to your account." }, { status: 403 });
  }

  const paid =
    session.payment_status === "paid" || session.payment_status === "no_payment_required";

  const quota = await getUserReelQuotaWithAdmin(admin, user.id);

  const { data: purchase } = await admin
    .from("stripe_credit_purchases")
    .select("credits_added")
    .eq("checkout_session_id", sessionId)
    .maybeSingle();

  if (purchase && paid) {
    return NextResponse.json({
      paid: true,
      fulfilled: true,
      creditsAdded: purchase.credits_added,
      reelCredits: quota.remaining,
    });
  }

  // Webhook hasn't fired yet (e.g. local dev, delayed delivery). Fulfill here as fallback.
  if (paid && !purchase) {
    const creditsRaw = session.metadata?.credits?.trim();
    const credits = Math.trunc(Number(creditsRaw));
    if (Number.isFinite(credits) && credits >= 1) {
      try {
        await admin.rpc("fulfill_stripe_credit_purchase", {
          p_session_id: sessionId,
          p_user_id: user.id,
          p_credits: credits,
        });
        const freshQuota = await getUserReelQuotaWithAdmin(admin, user.id);
        return NextResponse.json({
          paid: true,
          fulfilled: true,
          creditsAdded: credits,
          reelCredits: freshQuota.remaining,
        });
      } catch (e) {
        console.error("session-status fallback fulfill:", e);
      }
    }
  }

  return NextResponse.json({
    paid,
    fulfilled: false,
    reelCredits: quota.remaining,
  });
}
