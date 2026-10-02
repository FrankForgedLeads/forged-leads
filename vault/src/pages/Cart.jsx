import { useState } from "react";
import { useSearchParams, Link, Navigate } from "react-router-dom";
import { PLANS, yearlySavingsPct } from "../lib/pricing.js";
import { createCheckoutSession } from "../lib/api/billing.js";
import { formatCurrency } from "../lib/format.js";
import { VAULT_DISCLAIMER } from "../lib/disclaimer.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

// A real cart/checkout review step between "pick a plan" (/subscribe) and
// actually paying — Vault only ever sells one thing at a time (you can't
// hold both Solo and Crew in the same cart, they're mutually exclusive
// subscriptions), so this is a single-line-item cart, not a multi-SKU one.
// The card itself is still entered on Stripe's own hosted Checkout page
// (reached via "Proceed to payment" below) — that's the actual PCI-scoped
// card-processing step; this page is the review in front of it.
export default function Cart() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const planKey = searchParams.get("plan");
  const interval = searchParams.get("interval") === "yearly" ? "yearly" : "monthly";
  const plan = PLANS.find((p) => p.key === planKey);

  // No valid plan in the URL (someone landed here directly, or with a typo'd
  // query string) — send them back to pick one rather than show an empty cart.
  if (!plan) return <Navigate to="/subscribe" replace />;

  const price = interval === "yearly" ? plan.yearly : plan.monthly;
  const periodLabel = interval === "yearly" ? "/yr" : "/mo";

  async function handleCheckout() {
    setLoading(true);
    setError("");
    try {
      const { url } = await createCheckoutSession(plan.key, interval);
      // A real, external (Stripe-hosted) redirect — react-router's
      // navigate() only handles in-app routes, so this is the correct
      // mechanism, same pattern already used in Account.jsx's billing
      // portal redirect.
      // eslint-disable-next-line react/immutability
      window.location.href = url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="container-vault max-w-2xl py-16">
      <Link to="/subscribe" className="text-sm text-white/50 hover:text-white">
        ← Change plan
      </Link>
      <h1 className="mt-1 text-3xl font-extrabold text-white">Your cart</h1>
      <p className="mt-1 text-white/60">Review your plan, then pay securely to start your trial.</p>

      <Card className="mt-8">
        <div className="flex items-start justify-between gap-4">
          {/* min-w-0: without it, a flex child won't shrink below its
              text's unwrapped width — the Crew tagline is long enough that
              at 320px this pushed the whole card (and page) wider than the
              viewport instead of wrapping to a second line. */}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-gold-500">
              {plan.name} plan
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-white">{plan.tagline}</h2>
            <p className="mt-1 text-sm text-white/50">{plan.seats}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-extrabold text-white">
              {formatCurrency(price)}
              <span className="text-sm font-semibold text-white/50">{periodLabel}</span>
            </p>
            {interval === "yearly" && (
              <p className="text-xs font-semibold text-gold-500">Save {yearlySavingsPct(plan)}% vs. monthly</p>
            )}
          </div>
        </div>

        <ul className="mt-5 space-y-2 border-t border-navy-700/60 pt-5 text-sm text-white/70">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.3 9.5a1 1 0 1 1 1.4-1.4l3.6 3.6 6.7-6.7a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between border-t border-navy-700/60 pt-5">
          <span className="text-sm font-bold uppercase tracking-wide text-white/50">Due today</span>
          <span className="text-lg font-extrabold text-white">$0.00</span>
        </div>
        <p className="mt-1 text-xs text-white/40">
          7-day free trial — your card is verified now but not charged. First charge of{" "}
          {formatCurrency(price)}
          {periodLabel} is on day 8, unless you cancel first from Account.
        </p>
      </Card>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
          {error}
        </p>
      )}

      <Button as="button" type="button" onClick={handleCheckout} disabled={loading} className="mt-6 w-full">
        {loading ? "Redirecting to secure payment…" : "Proceed to payment"}
      </Button>
      <p className="mt-3 text-center text-xs text-white/40">
        Card details are entered on Stripe's secure payment page — Beeyond Vault never sees or
        stores your card number.
      </p>

      <p className="mt-8 text-xs leading-relaxed text-white/30">{VAULT_DISCLAIMER}</p>
    </div>
  );
}
