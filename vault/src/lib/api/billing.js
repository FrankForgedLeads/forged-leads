import { callFunction } from "./functionClient.js";

/** plan: 'solo' | 'crew', interval: 'monthly' | 'yearly'. Returns { url }. */
export function createCheckoutSession(plan, interval) {
  return callFunction("/.netlify/functions/create-checkout-session", { plan, interval });
}

/** Returns { url } for the Stripe Customer Portal. */
export function createPortalSession() {
  return callFunction("/.netlify/functions/create-portal-session", {});
}
