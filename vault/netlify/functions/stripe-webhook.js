import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { jsonResponse } from "./_lib/http.js";

// Built from entries() + filter rather than an object literal with computed
// keys: if a STRIPE_PRICE_* env var is unset (misconfiguration) its key
// would be the literal string "undefined", and a second unset var would
// silently overwrite the first's mapping instead of both being no-ops.
const PLAN_BY_PRICE_ID = Object.fromEntries(
  [
    [process.env.STRIPE_PRICE_SOLO_MONTHLY, "solo"],
    [process.env.STRIPE_PRICE_SOLO_YEARLY, "solo"],
    [process.env.STRIPE_PRICE_CREW_MONTHLY, "crew"],
    [process.env.STRIPE_PRICE_CREW_YEARLY, "crew"],
  ].filter(([priceId]) => Boolean(priceId)),
);

function planFromSubscription(subscription) {
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  return PLAN_BY_PRICE_ID[priceId] ?? null;
}

function toIso(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

// Netlify Functions v2 hands us a standard Request, so req.text() returns
// the untouched raw body — required for Stripe's signature check. Do not
// call req.json() first; that would consume the body and/or reserialize it,
// breaking verification.
export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return jsonResponse(500, { error: "Stripe env vars not configured" });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonResponse(500, { error: "Supabase service-role env vars not configured" });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return jsonResponse(400, { error: `Webhook signature verification failed: ${e.message}` });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, supabaseAdmin, event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabaseAdmin, event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabaseAdmin, event.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(supabaseAdmin, event.data.object);
        break;
      default:
        // Not one of the four events we're asked to handle — ignore.
        break;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[stripe-webhook] Failed handling ${event.type}:`, e);
    // Still 200: Stripe retries on non-2xx, and retrying a handler that's
    // failing for a data reason (not a transient one) just burns retries.
    // The error is logged for investigation either way.
    return jsonResponse(200, { received: true, warning: e.message });
  }

  return jsonResponse(200, { received: true });
};

async function handleCheckoutCompleted(stripe, supabaseAdmin, session) {
  const userId = session.client_reference_id;
  if (!userId) {
    // eslint-disable-next-line no-console
    console.warn("[stripe-webhook] checkout.session.completed with no client_reference_id, skipping");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  const plan = planFromSubscription(subscription);

  const update = {
    stripe_customer_id: session.customer,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    trial_ends_at: toIso(subscription.trial_end),
  };
  if (plan) update.plan = plan;

  // Crew: the owner's subscription covers the team. Create the team on
  // first Crew checkout and attach the owner to it so team_id-based
  // sharing (claims, letters) works immediately — invite UI is Phase 7.
  if (plan === "crew") {
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("team_id, company")
      .eq("id", userId)
      .maybeSingle();

    if (!existingProfile?.team_id) {
      const { data: team, error: teamError } = await supabaseAdmin
        .from("teams")
        .insert({
          owner_id: userId,
          name: existingProfile?.company || "My Team",
          seat_limit: 5,
        })
        .select("id")
        .single();
      if (teamError) throw teamError;
      update.team_id = team.id;
    }
  }

  const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", userId);
  if (error) throw error;
}

async function handleSubscriptionUpdated(supabaseAdmin, subscription) {
  const plan = planFromSubscription(subscription);
  const update = {
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    trial_ends_at: toIso(subscription.trial_end),
  };
  if (plan) update.plan = plan;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(update)
    .eq("stripe_customer_id", subscription.customer);
  if (error) throw error;
}

async function handleSubscriptionDeleted(supabaseAdmin, subscription) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ subscription_status: "canceled" })
    .eq("stripe_customer_id", subscription.customer);
  if (error) throw error;
}

async function handlePaymentFailed(supabaseAdmin, invoice) {
  if (!invoice.customer) return;
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ subscription_status: "past_due" })
    .eq("stripe_customer_id", invoice.customer);
  if (error) throw error;
}
