import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type PackId = "starter" | "growth" | "momentum";

const PACKS: Record<PackId, { credits: number; amountCents: number; currency: "eur"; name: string }> = {
  starter: { credits: 100, amountCents: 900, currency: "eur", name: "Starter Pack (100 Premium Credits)" },
  growth: { credits: 300, amountCents: 2500, currency: "eur", name: "Growth Pack (300 Premium Credits)" },
  momentum: { credits: 700, amountCents: 4900, currency: "eur", name: "Momentum Pack (700 Premium Credits)" },
};

function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_APP_URL");
  return url.replace(/\/$/, "");
}

async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const { pack_id } = (await req.json()) as { pack_id?: string };

    if (!pack_id || !["starter", "growth", "momentum"].includes(pack_id)) {
      return NextResponse.json({ ok: false, error: "invalid_pack_id" }, { status: 400 });
    }

    const pack = PACKS[pack_id as PackId];

    // Auth: require logged-in user
    const supabase = await getSupabaseServer();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Minimal profile check: must have a profile row
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ ok: false, error: "profile_missing" }, { status: 403 });
    }

    // Optional: require artist/admin (adjust roles if needed later)
    // We keep permissive for now: anyone with profile can buy premium credits.

    const appUrl = getAppUrl();
    const successUrl = `${appUrl}/artist/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/artist/billing/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata: {
        profile_id: user.id,
        pack_id: pack_id,
        credits: String(pack.credits),
        amount_cents: String(pack.amountCents),
        currency: pack.currency,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: pack.currency,
            unit_amount: pack.amountCents,
            product_data: {
              name: pack.name,
            },
          },
        },
      ],
    });

    return NextResponse.json({ ok: true, checkout_url: session.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      info: "Use POST with JSON body: { pack_id: 'starter' | 'growth' | 'momentum' }",
    },
    { status: 200 }
  );
}
