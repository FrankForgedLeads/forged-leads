// States the Vault's knowledge base actually covers AND is verified for
// real customers to use. South Carolina content is drafted
// (supabase/seed_items_sc.sql) but deliberately not listed here yet — it
// hasn't been run against the database, and its code citations/pricing
// haven't been verified the way this file's own header requires. Add 'SC'
// only after that review is done; adding it before then would let a real
// customer rely on an unverified citation in a letter to a carrier.
export const SUPPORTED_STATES = [{ code: "FL", name: "Florida" }];

export function stateName(code) {
  return SUPPORTED_STATES.find((s) => s.code === code)?.name ?? code;
}
