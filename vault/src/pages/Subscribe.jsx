import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PricingTable from "../components/PricingTable.jsx";
import { createCheckoutSession } from "../lib/api/billing.js";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Subscribe() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [loadingPlanKey, setLoadingPlanKey] = useState(null);
  const [error, setError] = useState("");

  const hadSubscriptionBefore = profile?.stripe_customer_id;
  const cancelled = searchParams.get("checkout") === "cancelled";

  async function handleSelectPlan(plan, interval) {
    setError("");
    setLoadingPlanKey(plan);
    try {
      const { url } = await createCheckoutSession(plan, interval);
      window.location.href = url;
    } catch (e) {
      setError(e.message);
      setLoadingPlanKey(null);
    }
  }

  return (
    <div className="container-vault py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold text-white">
          {hadSubscriptionBefore ? "Reactivate your subscription" : "Start your 7-day free trial"}
        </h1>
        <p className="mt-4 text-lg text-white/60">
          Card required to start. No charge until day 8. Cancel anytime from your account.
        </p>
        {cancelled && (
          <p className="mt-4 rounded-xl border border-navy-600 bg-navy-800/60 px-4 py-3 text-sm text-white/70">
            Checkout was cancelled — nothing was charged. Pick a plan below whenever you're ready.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
            {error}
          </p>
        )}
      </div>

      <div className="mt-14">
        <PricingTable onSelectPlan={handleSelectPlan} loadingPlanKey={loadingPlanKey} />
      </div>
    </div>
  );
}
