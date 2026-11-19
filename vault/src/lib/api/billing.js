import { callFunction } from "./functionClient.js";

/** plan: 'solo' | 'crew', interval: 'monthly' | 'yearly'. Returns { url }. */
export function createCheckoutSession(plan, interval) {
  return callFunction("/.netlify/functions/create-checkout-session", { plan, interval });
}

/** Returns { url } for the Stripe Customer Portal. */
export function createPortalSession() {
  return callFunction("/.netlify/functions/create-portal-session", {});
}

/**
 * Permanently deletes the signed-in user's account: cancels any active
 * Stripe subscription, removes their uploaded files, and deletes every
 * claim, document, finding, and letter they own (cascading from the
 * deleted auth user — see delete-account.js). Returns { deleted: true }.
 * Throws (with a message safe to show the user) if a Crew owner still has
 * teammates, since deleting them would silently cut off those teammates.
 */
export function deleteAccount() {
  return callFunction("/.netlify/functions/delete-account", {});
}
