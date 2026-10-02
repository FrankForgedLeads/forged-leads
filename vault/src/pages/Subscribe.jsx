import { useSearchParams, useNavigate } from "react-router-dom";
import PricingTable from "../components/PricingTable.jsx";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Subscribe() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const hadSubscriptionBefore = profile?.stripe_customer_id;
  const cancelled = searchParams.get("checkout") === "cancelled";

  // Picking a plan no longer goes straight to Stripe — it adds that plan
  // to the cart for review (see /cart) before anyone's card is touched.
  function handleSelectPlan(plan, interval) {
    navigate(`/cart?plan=${plan}&interval=${interval}`);
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
      </div>

      <div className="mt-14">
        <PricingTable onSelectPlan={handleSelectPlan} />
      </div>
    </div>
  );
}
