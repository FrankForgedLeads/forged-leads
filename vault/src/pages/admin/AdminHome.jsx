import { useEffect, useState } from "react";
import Card from "../../components/ui/Card.jsx";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import { fetchAllItemsForAdmin } from "../../lib/api/adminItems.js";
import { fetchLeads } from "../../lib/api/adminLeads.js";
import { fetchSubscribers } from "../../lib/api/adminSubscribers.js";
import { fetchAnalysisRuns } from "../../lib/api/adminAnalysis.js";

function StatCard({ label, value, sub, alert }) {
  return (
    <Card className={alert ? "border-red-500/40" : ""}>
      <p className="text-xs font-bold uppercase tracking-wide text-white/50">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${alert ? "text-red-400" : "text-white"}`}>{value}</p>
      {sub && <p className="mt-1 text-sm text-white/60">{sub}</p>}
    </Card>
  );
}

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchAllItemsForAdmin(), fetchLeads(), fetchSubscribers(), fetchAnalysisRuns()])
      .then(([items, leads, subscribers, runs]) => {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recentRuns = runs.filter((r) => new Date(r.started_at).getTime() >= thirtyDaysAgo);
        setStats({
          itemsTotal: items.length,
          itemsActive: items.filter((i) => i.is_active).length,
          itemsUnverified: items.filter((i) => !i.last_verified_date).length,
          leadsTotal: leads.length,
          leadsUncontacted: leads.filter((l) => !l.contacted_at).length,
          subscribersActive: subscribers.filter((s) =>
            ["trialing", "active"].includes(s.subscription_status),
          ).length,
          subscribersTotal: subscribers.length,
          analysisTotal: runs.length,
          analysisFailed: runs.filter((r) => r.status === "failed").length,
          analysisCost30d: recentRuns.reduce((sum, r) => sum + (r.estimated_cost_usd || 0), 0),
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="container-vault py-10">
      <h1 className="text-3xl font-extrabold text-white">Admin</h1>
      <p className="mt-1 text-white/60">Items, leads, subscribers, and analysis — ADMIN_EMAIL only.</p>

      <div className="mt-6">
        <AdminTabs />
      </div>

      {error && <p className="mt-6 font-semibold text-red-400">{error}</p>}

      {stats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Vault items"
            value={stats.itemsTotal}
            sub={`${stats.itemsActive} active · ${stats.itemsUnverified} not yet verified`}
          />
          <StatCard
            label="Scope Checker leads"
            value={stats.leadsTotal}
            sub={`${stats.leadsUncontacted} not yet contacted`}
          />
          <StatCard
            label="Subscribers"
            value={stats.subscribersTotal}
            sub={`${stats.subscribersActive} trialing or active`}
          />
          <StatCard
            label="Estimate Review runs"
            value={stats.analysisTotal}
            sub={`Est. cost, last 30 days: $${stats.analysisCost30d.toFixed(2)}`}
          />
          <StatCard
            label="Failed analyses"
            value={stats.analysisFailed}
            alert={stats.analysisFailed > 0}
            sub={stats.analysisFailed > 0 ? "Check Analysis runs — customers saw a failure message" : "None — good sign"}
          />
        </div>
      )}
    </div>
  );
}
