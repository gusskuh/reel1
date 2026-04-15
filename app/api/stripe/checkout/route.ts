import { NextResponse } from "next/server";
import { getAppOriginFromRequest } from "@/lib/appOrigin";
import { getCreditPack, getPriceIdForPack } from "@/lib/stripeCredits";
import { getStripe } from "@/lib/stripeServer";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." }, { status: 500 });
  }

  const origin = getAppOriginFromRequest(req);
  if (!origin) {
    return NextResponse.json(
      {
        error:
          "Could not determine app URL. Set NEXT_PUBLIC_APP_URL (e.g. https://your-domain.com) for reliable Stripe redirects.",
      },
      { status: 500 }
    );
  }

  let tier: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    tier = typeof body.tier === "string" ? body.tier : undefined;
  } catch {
    tier = undefined;
  }

  const pack = tier ? getCreditPack(tier) : null;
  if (!pack) {
    return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
  }

  const priceId = getPriceIdForPack(pack);
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing env ${pack.envPriceVar} for this price tier.` },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required to buy credits." }, { status: 401 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/purchase-thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/buy-credits`,
    client_reference_id: user.id,
    metadata: {
      supabase_user_id: user.id,
      credits: String(pack.credits),
    },
    payment_intent_data: {
      metadata: {
        supabase_user_id: user.id,
        credits: String(pack.credits),
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
