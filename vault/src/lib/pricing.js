// Plan data shared by the Landing pricing section and the standalone /pricing page.
// Stripe price IDs are wired up via netlify/functions/create-checkout-session.js.
// This file just drives the UI copy and the monthly/annual toggle math.

export const PLANS = [
  {
    key: "solo",
    name: "Solo",
    tagline: "For one estimator or crew lead running reviews solo.",
    monthly: 39.99,
    yearly: 390,
    seats: "1 user",
    features: [
      "Full Vault access — the knowledge base behind every review",
      "Unlimited saved projects",
      "Documentation builder, all 3 templates",
      "PDF export with your company block",
      "Monthly update emails",
    ],
    highlight: false,
  },
  {
    key: "crew",
    name: "Crew",
    tagline: "For companies running multiple estimators or adjusters.",
    monthly: 99.99,
    yearly: 990,
    seats: "Up to 5 users",
    features: [
      "Everything in Solo",
      "Up to 5 team seats on one subscription",
      "Shared projects across your team",
      "Invite teammates by email",
      "Priority monthly update delivery",
    ],
    highlight: true,
  },
];

export function yearlySavingsPct(plan) {
  const fullYear = plan.monthly * 12;
  const savings = fullYear - plan.yearly;
  return Math.round((savings / fullYear) * 100);
}
