import Stripe from "stripe";
import { requireUser } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return jsonResponse(500, { error: "STRIPE_SECRET_KEY is not configured" });
  }

  const { user, supabase, error: authError } = await requireUser(req);
  if (authError) return jsonResponse(401, { error: authError });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return jsonResponse(500, { error: profileError.message });
  if (!profile?.stripe_customer_id) {
    return jsonResponse(400, { error: "No billing account on file yet — start a subscription first." });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = req.headers.get("origin") || new URL(req.url).origin;

  let portalSession;
  try {
    portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/account`,
    });
  } catch (e) {
    return jsonResponse(502, { error: `Stripe error: ${e.message}` });
  }

  return jsonResponse(200, { url: portalSession.url });
};
