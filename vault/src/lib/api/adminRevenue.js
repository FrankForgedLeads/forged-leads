import { callFunction } from "./functionClient.js";

/**
 * Live revenue numbers computed fresh from Stripe (admin only). Returns
 * { mrr, activeCount, trialingCount, byPlan, totalCollected, chargeCount,
 *   hitHistoryLimit, generatedAt }.
 */
export function fetchRevenue() {
  return callFunction("/.netlify/functions/admin-revenue", {});
}
