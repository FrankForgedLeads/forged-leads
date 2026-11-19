import { callFunction } from "./functionClient.js";

/** Returns { sent: number }. */
export function sendMonthlyUpdate(subject, bodyHtml) {
  return callFunction("/.netlify/functions/send-monthly-update", { subject, bodyHtml });
}
