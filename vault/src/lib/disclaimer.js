// Required verbatim in three places per the product spec: the public
// footer, the letter builder page, and every exported PDF. Keep this the
// single source of truth so all three never drift apart.
export const VAULT_DISCLAIMER =
  "Beeyond Vault is a reference tool for contractors. It does not prepare, submit, or guarantee the accuracy of your estimate — you are solely responsible for it. Beeyond Vault is not a public adjuster, does not represent policyholders, and does not provide legal advice. Beeyond Vault is not responsible for claim outcomes, carrier decisions, or the actions of any public adjuster, insurer, or other third party. Verify all codes and amounts before submitting.";

// Required verbatim on every Estimate Review analysis screen per the
// product spec — distinct from VAULT_DISCLAIMER above, which covers the
// product generally. This one specifically addresses the AI-generated
// findings themselves.
export const ANALYSIS_DISCLAIMER =
  "Vault provides reference and documentation assistance only. Findings require professional review and verification. You are solely responsible for your final estimate. Vault does not determine coverage, payment, or claim outcome, and is not responsible for how any public adjuster, insurer, or other third party uses or acts on this review.";
