import { useState } from "react";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import { PLANS, yearlySavingsPct } from "../lib/pricing.js";

export default function PricingTable({
  showTrialNote = true,
  // When provided, plan buttons call onSelectPlan(planKey, "monthly"|"yearly")
  // instead of linking to /login — used by /subscribe to trigger Stripe
  // Checkout for an already-signed-in user. loadingPlanKey disables/labels
  // the button for whichever plan is mid-checkout-creation.
  onSelectPlan,
  loadingPlanKey,
}) {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      <div className="mb-10 flex items-center justify-center gap-4">
        <span className={`text-sm font-semibold ${!annual ? "text-white" : "text-white/50"}`}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual((a) => !a)}
          className="relative inline-flex h-9 w-16 shrink-0 items-center rounded-full bg-navy-700 border border-navy-500 transition"
        >
          <span
            className={`inline-block h-7 w-7 transform rounded-full bg-gold-500 transition ${
              annual ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
        <span className={`text-sm font-semibold ${annual ? "text-white" : "text-white/50"}`}>
          Annual <span className="text-gold-500">(save)</span>
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const price = annual ? plan.yearly : plan.monthly;
          const period = annual ? "/yr" : "/mo";
          return (
            <Card
              key={plan.key}
              className={`relative flex flex-col ${
                plan.highlight ? "border-gold-500/70 ring-1 ring-gold-500/30" : ""
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-navy-950">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-extrabold text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-white/60">{plan.tagline}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">${price}</span>
                <span className="text-white/50">{period}</span>
              </div>
              {annual && (
                <p className="mt-1 text-xs font-semibold text-gold-500">
                  Save {yearlySavingsPct(plan)}% vs. monthly
                </p>
              )}
              <p className="mt-2 text-sm font-semibold text-white/70">{plan.seats}</p>

              <ul className="mt-6 flex-1 space-y-3 text-sm text-white/80">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg
                      viewBox="0 0 20 20"
                      className="mt-0.5 h-5 w-5 shrink-0 text-gold-500"
                      fill="currentColor"
                    >
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

              {onSelectPlan ? (
                <Button
                  as="button"
                  type="button"
                  onClick={() => onSelectPlan(plan.key, annual ? "yearly" : "monthly")}
                  disabled={Boolean(loadingPlanKey)}
                  variant={plan.highlight ? "primary" : "secondary"}
                  className="mt-8 w-full"
                >
                  {loadingPlanKey === plan.key ? "Redirecting to checkout…" : "Start 7-day free trial"}
                </Button>
              ) : (
                <Button
                  to="/login"
                  variant={plan.highlight ? "primary" : "secondary"}
                  className="mt-8 w-full"
                >
                  Start 7-day free trial
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {showTrialNote && (
        <p className="mt-6 text-center text-sm text-white/50">
          Card required to start. Cancel anytime from your account. No charge until day 8.
        </p>
      )}
    </div>
  );
}
