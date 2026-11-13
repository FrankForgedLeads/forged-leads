import Stripe from "stripe";
import { requireUser } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

// How many recent successful charges to sum for "total collected." For a
// brand-new live account this covers everything; once the business has
// more than a few hundred charges, this becomes a "recent" figure rather
// than a true lifetime total — chargeCount in the response tells the
// admin page whether it hit that cap, so the UI can say so rather than
// silently understating revenue.
const CHARGE_HISTORY_LIMIT = 500;

// Admin-only read of live Stripe numbers — nothing here is persisted,
// it's computed fresh from Stripe on every call. Deliberately NOT stored
// in Supabase: Stripe is the one source of truth for money actually
// collected, and a cached/derived copy would just be one more place for
// the real number and the shown number to drift apart.
export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { STRIPE_SECRET_KEY } = process.env;
  if (!STRIPE_SECRET_KEY) return jsonResponse(500, { error: "STRIPE_SECRET_KEY is not configured" });

  // Same admin-check pattern as send-monthly-update.js: the admins table
  // via is_admin(), checked under the caller's own JWT.
  const { supabase, error: authError } = await requireUser(req);
  if (authError) return jsonResponse(401, { error: authError });

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) return jsonResponse(500, { error: adminError.message });
  if (!isAdmin) return jsonResponse(403, { error: "Admin access required" });

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  // MRR: every active or trialing subscription's recurring amount,
  // normalized to a monthly figure (a yearly price divided by 12). A
  // trialing subscription is included because that revenue is already
  // committed to start once the trial ends — excluding it would
  // understate the near-term number right when it matters most (the
  // period right after a signup push).
  let mrr = 0;
  let activeCount = 0;
  let trialingCount = 0;
  const byPlan = {};
  try {
    for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      if (!["active", "trialing"].includes(sub.status)) continue;
      if (sub.status === "active") activeCount++;
      if (sub.status === "trialing") trialingCount++;
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = (price.unit_amount || 0) / 100;
        const monthly = price.recurring?.interval === "year" ? amount / 12 : amount;
        const contribution = monthly * (item.quantity || 1);
        mrr += contribution;
        const planKey = price.nickname || price.id;
        byPlan[planKey] = (byPlan[planKey] || 0) + contribution;
      }
    }
  } catch (e) {
    return jsonResponse(502, { error: `Stripe error listing subscriptions: ${e.message}` });
  }

  // Total collected: successful, non-refunded charges. This is a real
  // cash-collected figure, distinct from MRR (which is a run-rate
  // projection, not money that has actually landed).
  let totalCollected = 0;
  let chargeCount = 0;
  let hitHistoryLimit = false;
  try {
    for await (const charge of stripe.charges.list({ limit: 100 })) {
      chargeCount++;
      if (charge.status === "succeeded" && charge.paid && !charge.refunded) {
        totalCollected += (charge.amount - (charge.amount_refunded || 0)) / 100;
      }
      if (chargeCount >= CHARGE_HISTORY_LIMIT) {
        hitHistoryLimit = true;
        break;
      }
    }
  } catch (e) {
    return jsonResponse(502, { error: `Stripe error listing charges: ${e.message}` });
  }

  return jsonResponse(200, {
    mrr: Math.round(mrr * 100) / 100,
    activeCount,
    trialingCount,
    byPlan,
    totalCollected: Math.round(totalCollected * 100) / 100,
    chargeCount,
    hitHistoryLimit,
    generatedAt: new Date().toISOString(),
  });
};
