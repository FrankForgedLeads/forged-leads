// Required verbatim in three places per the product spec: the public
// footer, the letter builder page, and every exported PDF. Keep this the
// single source of truth so all three never drift apart.
export const VAULT_DISCLAIMER =
  "Beeyond Vault is a reference tool for contractors. It is not a public adjuster, does not represent policyholders, and does not provide legal advice. Verify all codes and amounts before submitting.";

// Required verbatim on every Estimate Review analysis screen per the
// product spec — distinct from VAULT_DISCLAIMER above, which covers the
// product generally. This one specifically addresses the AI-generated
// findings themselves.
export const ANALYSIS_DISCLAIMER =
  "Vault provides reference and documentation assistance only. Findings require professional review and verification. Vault does not determine coverage, payment, or claim outcome.";
