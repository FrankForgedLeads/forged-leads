import { midpoint } from "./format.js";

// Shared between the claim detail page and the letter builder so the
// running total and the per-item line total are computed exactly one way.
export function unitAmount(row) {
  return row.custom_amount ?? midpoint(row.items?.low_amount, row.items?.high_amount);
}

export function lineTotal(row) {
  return unitAmount(row) * Number(row.quantity || 0);
}

export function claimTotal(rows) {
  return rows.reduce((sum, r) => sum + lineTotal(r), 0);
}
