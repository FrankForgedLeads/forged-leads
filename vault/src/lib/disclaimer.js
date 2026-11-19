// Required verbatim in three places per the product spec: the public
// footer, the letter builder page, and every exported PDF. Keep this the
// single source of truth so all three never drift apart.
export const VAULT_DISCLAIMER =
  "Beeyond Vault does not create, write, prepare, or submit your estimate — you are its sole author and solely responsible for its accuracy. Beeyond Vault is a reference tool only, not a public adjuster, and does not represent policyholders or provide legal advice. Beeyond Vault is not responsible for claim outcomes, carrier decisions, or the actions of any public adjuster, insurer, or other third party. Verify all codes and amounts before submitting.";

// Required verbatim on every Estimate Review analysis screen per the
// product spec — distinct from VAULT_DISCLAIMER above, which covers the
// product generally. This one specifically addresses the AI-generated
// findings themselves.
export const ANALYSIS_DISCLAIMER =
  "Vault only flags items for your own review — it does not write, create, or submit your estimate. You are the sole author of your final estimate and solely responsible for it. Findings require professional verification before you rely on them. Vault does not determine coverage, payment, or claim outcome, and is not responsible for how any public adjuster, insurer, or other third party uses or acts on this review.";
