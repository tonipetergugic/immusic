import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type PackId = "starter" | "growth" | "momentum";

const PACKS: Record<PackId, { credits: number; amountCents: number; currency: "eur" }> = {
  starter: { credits: 100, amountCents: 900, currency: "eur" },
  growth: { credits: 300, amountCents: 2500, currency: "eur" },
  momentum: { credits: 700, amountCents: 4900, currency: "eur" },
};

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  return secret;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, getWebhookSecret());
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  try {
    // We only handle completed checkout sessions for V1
    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // Only process paid sessions
    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const metadata = session.metadata ?? {};
    const profileId = metadata.profile_id;
    const packId = metadata.pack_id as PackId | undefined;

    if (!profileId || !packId || !(packId in PACKS)) {
      console.error("Invalid metadata on session:", metadata);
      return NextResponse.json({ ok: false, error: "invalid_metadata" }, { status: 400 });
    }

    const pack = PACKS[packId];
    const amountTotal = session.amount_total ?? null;
    const currency = (session.currency ?? "").toLowerCase();

    // Server-side validation: amount/currency must match our known pack mapping
    if (amountTotal !== pack.amountCents || currency !== pack.currency) {
      console.error("Amount/currency mismatch:", { amountTotal, currency, pack });
      return NextResponse.json({ ok: false, error: "amount_mismatch" }, { status: 400 });
    }

    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
    const checkoutSessionId = session.id;

    const supabaseAdmin = getSupabaseAdmin();

    // Call atomic DB function (ledger + balance update).
    // Idempotency is enforced by UNIQUE indexes on stripe ids.
    const { error } = await supabaseAdmin.rpc("apply_premium_credit_purchase", {
      p_profile_id: profileId,
      p_credits: pack.credits,
      p_event_type: "purchase",
      p_reason: "premium_credits_purchase",
      p_source: "stripe",
      p_stripe_payment_intent_id: paymentIntentId,
      p_stripe_checkout_session_id: checkoutSessionId,
      p_stripe_charge_id: null,
      p_pack_id: packId,
      p_amount_cents: pack.amountCents,
      p_currency: pack.currency,
      p_external_provider: "stripe",
    } as any);

    // If already processed, DB may throw unique violation. Supabase returns it as error.
    // We treat that as OK (idempotent).
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const isUniqueViolation =
        msg.includes("duplicate") || msg.includes("unique") || msg.includes("uq_stripe");

      if (isUniqueViolation) {
        return NextResponse.json({ ok: true, already_processed: true });
      }

      console.error("apply_premium_credit_purchase failed:", error);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      info: "Stripe webhook endpoint. Use POST from Stripe. This GET is only for diagnostics.",
    },
    { status: 200 }
  );
}
