import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripeServer";
import { getServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function fulfillPaidCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const status = session.payment_status;
  if (status !== "paid" && status !== "no_payment_required") {
    return;
  }

  const userId = session.metadata?.supabase_user_id?.trim();
  const creditsRaw = session.metadata?.credits?.trim();
  if (!userId || !creditsRaw) {
    console.error("Stripe webhook: missing metadata on session", session.id);
    return;
  }

  const credits = Math.trunc(Number(creditsRaw));
  if (!Number.isFinite(credits) || credits < 1) {
    console.error("Stripe webhook: invalid credits metadata", session.id, creditsRaw);
    return;
  }

  const admin = getServiceRoleClient();
  if (!admin) {
    console.error("Stripe webhook: missing SUPABASE_SERVICE_ROLE_KEY");
    throw new Error("Server misconfiguration");
  }

  const { error } = await admin.rpc("fulfill_stripe_credit_purchase", {
    p_session_id: session.id,
    p_user_id: userId,
    p_credits: credits,
  });

  if (error) {
    console.error("fulfill_stripe_credit_purchase:", error.message, error.code);
    throw error;
  }
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook signature:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await fulfillPaidCheckoutSession(session);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Stripe webhook handler:", e);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
