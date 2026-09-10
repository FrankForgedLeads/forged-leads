import PricingTable from "../components/PricingTable.jsx";

export default function Pricing() {
  return (
    <div className="container-vault py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
          One subscription. Everything the adjuster left off.
        </h1>
        <p className="mt-4 text-lg text-white/60">
          7-day free trial, card required. No charge until day 8. Cancel anytime from your
          account.
        </p>
      </div>

      <div className="mt-14">
        <PricingTable />
      </div>

      <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-navy-700/60 bg-navy-800/40 p-6 text-sm text-white/60">
        <p>
          <strong className="text-white">Need more than 5 seats?</strong> Email{" "}
          <a href="mailto:leads@beeyondestimators.com" className="text-gold-500 underline">
            leads@beeyondestimators.com
          </a>{" "}
          and we'll set up a larger team plan.
        </p>
      </div>
    </div>
  );
}
