import { supabase } from "../supabaseClient.js";

async function callFunction(path, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You need to be signed in.");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** plan: 'solo' | 'crew', interval: 'monthly' | 'yearly'. Returns { url }. */
export function createCheckoutSession(plan, interval) {
  return callFunction("/.netlify/functions/create-checkout-session", { plan, interval });
}

/** Returns { url } for the Stripe Customer Portal. */
export function createPortalSession() {
  return callFunction("/.netlify/functions/create-portal-session", {});
}
