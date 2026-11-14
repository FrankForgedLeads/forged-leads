import { describe, it, expect } from "vitest";
import { lineTotal, roomTotal, estimateSubtotal, computeEstimateTotals } from "../totals.js";

describe("lineTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineTotal({ quantity: 3, unit_price: 12.5 })).toBe(37.5);
  });
});

describe("roomTotal", () => {
  it("sums every line item in the room", () => {
    const room = {
      remodel_room_items: [
        { quantity: 2, unit_price: 10 },
        { quantity: 1, unit_price: 5 },
      ],
    };
    expect(roomTotal(room)).toBe(25);
  });

  it("returns 0 for a room with no items", () => {
    expect(roomTotal({ remodel_room_items: [] })).toBe(0);
    expect(roomTotal({})).toBe(0);
  });
});

describe("estimateSubtotal", () => {
  it("sums every room's total", () => {
    const rooms = [
      { remodel_room_items: [{ quantity: 1, unit_price: 100 }] },
      { remodel_room_items: [{ quantity: 2, unit_price: 50 }] },
    ];
    expect(estimateSubtotal(rooms)).toBe(200);
  });
});

describe("computeEstimateTotals", () => {
  const rooms = [{ remodel_room_items: [{ quantity: 1, unit_price: 1000 }] }];

  it("applies overhead, profit, and tax independently as flat percentages of subtotal", () => {
    const totals = computeEstimateTotals(rooms, { overheadPct: 10, profitPct: 10, taxPct: 7 });
    expect(totals.subtotal).toBe(1000);
    expect(totals.overheadAmount).toBe(100);
    expect(totals.profitAmount).toBe(100);
    expect(totals.taxAmount).toBe(70);
    expect(totals.grandTotal).toBe(1270);
  });

  it("defaults every percentage to 0 when omitted", () => {
    const totals = computeEstimateTotals(rooms);
    expect(totals.grandTotal).toBe(1000);
  });
});
