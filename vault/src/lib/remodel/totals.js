// Pure math only — no fetching, no React — so both the live-editing UI and
// the PDF export compute the exact same numbers from the exact same code.
//
// Overhead/profit/tax are each a flat % of the line-item subtotal, applied
// independently (not compounded) — the same convention Xactimate's O&P
// summary uses, which is the convention Frank's own Excel template and his
// clients already expect.

export function lineTotal(item) {
  return Number(item.quantity) * Number(item.unit_price);
}

export function roomTotal(room) {
  return (room.remodel_room_items || []).reduce((sum, item) => sum + lineTotal(item), 0);
}

export function estimateSubtotal(rooms) {
  return rooms.reduce((sum, room) => sum + roomTotal(room), 0);
}

export function computeEstimateTotals(rooms, { overheadPct = 0, profitPct = 0, taxPct = 0 } = {}) {
  const subtotal = estimateSubtotal(rooms);
  const overheadAmount = subtotal * (Number(overheadPct) / 100);
  const profitAmount = subtotal * (Number(profitPct) / 100);
  const taxAmount = subtotal * (Number(taxPct) / 100);
  const grandTotal = subtotal + overheadAmount + profitAmount + taxAmount;

  return { subtotal, overheadAmount, profitAmount, taxAmount, grandTotal };
}
