// Content for the free /scope-checker lead magnet. Deliberately separate
// from the real Vault items table (which is RLS-gated to signed-in
// subscribers) — this is 12 hand-picked, commonly-missed items with a flat
// "typical impact on an average South Florida single-family re-roof/claim"
// dollar figure, not the per-unit Vault pricing. Draft numbers for Frankie's
// review, same as supabase/seed_items.sql — nothing here is final.
export const SCOPE_CHECKLIST = [
  { id: "drip_edge", label: "Drip edge", amount: 600,
    note: "Required by code at every eave and rake — frequently left off entirely." },
  { id: "underlayment", label: "Secondary water barrier / synthetic underlayment", amount: 2200,
    note: "Required by FBC and HVHZ sealed-deck rules, often priced as generic felt." },
  { id: "ridge_cap", label: "Ridge cap / hip & ridge shingles", amount: 850,
    note: "A distinct wind-rated material, sometimes folded into field shingles." },
  { id: "steep_high", label: "Steep or high roof charge", amount: 900,
    note: "Extra labor for pitch 7/12+ or 2+ stories — in the adjuster's own measurements." },
  { id: "ice_water", label: "Ice & water shield at valleys and penetrations", amount: 700,
    note: "Required membrane, often priced as plain underlayment instead." },
  { id: "pipe_jacks", label: "Pipe jacks / boots", amount: 400,
    note: "Every penetration needs its own — estimates often under-count them." },
  { id: "renailing", label: "Decking re-nailing to current code", amount: 1200,
    note: "Required when existing decking doesn't meet the current nailing schedule." },
  { id: "permit", label: "Permit fees", amount: 450,
    note: "A real, billable cost — often left off or underpriced." },
  { id: "detach_reset", label: "Detach & reset (gutters, solar, AC lines, satellite)", amount: 650,
    note: "Has to come off before tear-off and go back on after." },
  { id: "op", label: "Overhead & profit (3+ trades)", amount: 1800,
    note: "Standard when a loss requires coordinating 3+ trades — often missing." },
  { id: "hvhz", label: "HVHZ compliance upgrade", amount: 1500,
    note: "Stricter code requirements in Miami-Dade and Broward that get missed by non-HVHZ templates." },
  { id: "water_mit", label: "Water mitigation equipment (air movers, dehumidifiers)", amount: 1100,
    note: "Priced per IICRC S500 for the actual number of drying days needed." },
];

export function checklistTotal(checkedIds) {
  return SCOPE_CHECKLIST.filter((i) => checkedIds.has(i.id)).reduce((sum, i) => sum + i.amount, 0);
}
