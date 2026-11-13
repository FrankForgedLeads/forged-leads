import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { jsonResponse } from "./_lib/http.js";
import { sendEmail } from "./_lib/resend.js";

const FROM_ADDRESS = "Beeyond Vault Alerts <alerts@beeyondestimators.com>";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Netlify scheduled function: runs automatically, no request from the app
// triggers this. Monday 13:00 UTC = 8am EST / 9am EDT.
export const config = { schedule: "0 13 * * 1" };

// Separated from the handler below so the HTML can be unit-tested without
// mocking Stripe or Supabase — same reasoning as estimateAnalysisService.js
// splitting the API call from the logic around it.
export function buildDigestHtml(stats) {
  const { newSignups, pastDueCount, mrr, activeCount, trialingCount, generatedAt } = stats;
  return `
    <h2>Beeyond Vault — weekly digest</h2>
    <p>Week ending ${new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
    <ul>
      <li><strong>New signups (last 7 days):</strong> ${newSignups}</li>
      <li><strong>Active subscribers:</strong> ${activeCount}</li>
      <li><strong>On trial:</strong> ${trialingCount}</li>
      <li><strong>Past due (failed payment):</strong> ${pastDueCount}${pastDueCount > 0 ? " — worth a check-in" : ""}</li>
      <li><strong>Current MRR:</strong> $${mrr.toFixed(2)}</li>
    </ul>
  `.trim();
}

export default async (_req) => {
  const { STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, ADMIN_EMAIL } = process.env;
  if (!STRIPE_SECRET_KEY) return jsonResponse(500, { error: "STRIPE_SECRET_KEY is not configured" });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonResponse(500, { error: "Supabase service-role env vars not configured" });
  }
  if (!RESEND_API_KEY || !ADMIN_EMAIL) {
    return jsonResponse(500, { error: "RESEND_API_KEY and ADMIN_EMAIL are required for the weekly digest" });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  const { count: newSignups, error: signupsError } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);
  if (signupsError) return jsonResponse(500, { error: signupsError.message });

  const { count: pastDueCount, error: pastDueError } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("subscription_status", "past_due");
  if (pastDueError) return jsonResponse(500, { error: pastDueError.message });

  // Same MRR calculation as admin-revenue.js, kept separate rather than
  // imported — that file's version is gated behind an admin HTTP request
  // and returns several other fields this digest doesn't need.
  let mrr = 0;
  let activeCount = 0;
  let trialingCount = 0;
  try {
    for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      if (!["active", "trialing"].includes(sub.status)) continue;
      if (sub.status === "active") activeCount++;
      if (sub.status === "trialing") trialingCount++;
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = (price.unit_amount || 0) / 100;
        const monthly = price.recurring?.interval === "year" ? amount / 12 : amount;
        mrr += monthly * (item.quantity || 1);
      }
    }
  } catch (e) {
    return jsonResponse(502, { error: `Stripe error listing subscriptions: ${e.message}` });
  }

  const stats = {
    newSignups: newSignups ?? 0,
    pastDueCount: pastDueCount ?? 0,
    mrr,
    activeCount,
    trialingCount,
    generatedAt: new Date().toISOString(),
  };

  try {
    await sendEmail({
      apiKey: RESEND_API_KEY,
      from: FROM_ADDRESS,
      to: ADMIN_EMAIL,
      subject: "Beeyond Vault — your weekly digest",
      html: buildDigestHtml(stats),
    });
  } catch (e) {
    return jsonResponse(502, { error: e.message });
  }

  return jsonResponse(200, { sent: true, stats });
};
