import { useEffect, useState } from "react";
import Card from "../../components/ui/Card.jsx";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import { fetchAllItemsForAdmin } from "../../lib/api/adminItems.js";
import { fetchLeads } from "../../lib/api/adminLeads.js";
import { fetchSubscribers } from "../../lib/api/adminSubscribers.js";

function StatCard({ label, value, sub }) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-1 text-sm text-white/60">{sub}</p>}
    </Card>
  );
}

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchAllItemsForAdmin(), fetchLeads(), fetchSubscribers()])
      .then(([items, leads, subscribers]) => {
        setStats({
          itemsTotal: items.length,
          itemsActive: items.filter((i) => i.is_active).length,
          leadsTotal: leads.length,
          leadsUncontacted: leads.filter((l) => !l.contacted_at).length,
          subscribersActive: subscribers.filter((s) =>
            ["trialing", "active"].includes(s.subscription_status),
          ).length,
          subscribersTotal: subscribers.length,
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="container-vault py-10">
      <h1 className="text-3xl font-extrabold text-white">Admin</h1>
      <p className="mt-1 text-white/60">Items, leads, and subscribers — ADMIN_EMAIL only.</p>

      <div className="mt-6">
        <AdminTabs />
      </div>

      {error && <p className="mt-6 font-semibold text-red-400">{error}</p>}

      {stats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Vault items"
            value={stats.itemsTotal}
            sub={`${stats.itemsActive} active`}
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
        </div>
      )}
    </div>
  );
}
