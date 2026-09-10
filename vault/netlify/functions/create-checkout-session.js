import Stripe from "stripe";
import { requireUser } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

const PRICE_MAP = {
  solo: {
    monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY,
    yearly: process.env.STRIPE_PRICE_SOLO_YEARLY,
  },
  crew: {
    monthly: process.env.STRIPE_PRICE_CREW_MONTHLY,
    yearly: process.env.STRIPE_PRICE_CREW_YEARLY,
  },
};

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return jsonResponse(500, { error: "STRIPE_SECRET_KEY is not configured" });
  }

  const { user, supabase, error: authError } = await requireUser(req);
  if (authError) return jsonResponse(401, { error: authError });

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { plan, interval } = body || {};
  if (!["solo", "crew"].includes(plan) || !["monthly", "yearly"].includes(interval)) {
    return jsonResponse(400, { error: "plan must be solo/crew and interval monthly/yearly" });
  }

  const priceId = PRICE_MAP[plan][interval];
  if (!priceId) {
    return jsonResponse(500, { error: `No Stripe price configured for ${plan}/${interval}` });
  }

  // Reuse the same Stripe Customer across resubscribes (e.g. after a
  // cancellation) instead of letting Checkout mint a new one every time,
  // which would fragment billing history under two customer records.
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = req.headers.get("origin") || new URL(req.url).origin;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      subscription_data: {
        trial_period_days: 7,
        metadata: { supabase_user_id: user.id, plan },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/subscribe?checkout=cancelled`,
    });
  } catch (e) {
    return jsonResponse(502, { error: `Stripe error: ${e.message}` });
  }

  return jsonResponse(200, { url: session.url });
};
