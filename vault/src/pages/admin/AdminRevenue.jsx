import { useEffect, useState } from "react";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import { fetchRevenue } from "../../lib/api/adminRevenue.js";
import { formatCurrency } from "../../lib/format.js";

function StatCard({ label, value, sub }) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-1 text-sm text-white/60">{sub}</p>}
    </Card>
  );
}

export default function AdminRevenue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    fetchRevenue()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="container-vault py-10">
      <h1 className="text-3xl font-extrabold text-white">Admin</h1>
      <p className="mt-1 text-white/60">Live revenue numbers, computed directly from Stripe.</p>

      <div className="mt-6">
        <AdminTabs />
      </div>

      {error && <p className="mt-6 font-semibold text-red-400">{error}</p>}

      <div className="mt-6">
        <Button as="button" type="button" variant="secondary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {data && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Monthly recurring revenue"
              value={formatCurrency(data.mrr)}
              sub="Active + trialing subscriptions, normalized to monthly"
            />
            <StatCard
              label="Active subscriptions"
              value={data.activeCount}
              sub={`${data.trialingCount} currently trialing`}
            />
            <StatCard
              label="Total collected"
              value={formatCurrency(data.totalCollected)}
              sub={
                data.hitHistoryLimit
                  ? `Last ${data.chargeCount} charges — more history exists`
                  : `${data.chargeCount} successful charge${data.chargeCount === 1 ? "" : "s"}, all-time`
              }
            />
          </div>

          {Object.keys(data.byPlan).length > 0 && (
            <Card className="mt-6">
              <h2 className="font-bold text-white">MRR by plan</h2>
              <ul className="mt-3 space-y-2">
                {Object.entries(data.byPlan).map(([plan, amount]) => (
                  <li key={plan} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">{plan}</span>
                    <span className="font-bold text-white">{formatCurrency(amount)}/mo</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <p className="mt-4 text-xs text-white/40">
            Generated {new Date(data.generatedAt).toLocaleString()} — pulled live from Stripe, not stored.
          </p>
        </>
      )}
    </div>
  );
}
