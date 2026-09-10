import { useEffect, useState } from "react";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import { formatDate } from "../../lib/format.js";
import { subscriptionStatusLabel } from "../../lib/subscription.js";
import { fetchSubscribers } from "../../lib/api/adminSubscribers.js";

const STATUS_STYLE = {
  trialing: "border-gold-500 bg-gold-500/10 text-gold-500",
  active: "border-green-500 bg-green-500/10 text-green-400",
  past_due: "border-red-500 bg-red-500/10 text-red-400",
  canceled: "border-navy-500 bg-navy-800 text-white/50",
};

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSubscribers()
      .then(setSubscribers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-vault py-10">
      <h1 className="text-3xl font-extrabold text-white">Admin</h1>
      <p className="mt-1 text-white/60">Every signed-up user — {subscribers.length} total.</p>

      <div className="mt-6">
        <AdminTabs />
      </div>

      {error && <p className="mt-4 font-semibold text-red-400">{error}</p>}
      {loading && <p className="mt-6 text-white/60">Loading…</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-700/60">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-navy-800/60 text-xs font-bold uppercase tracking-wide text-white/50">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trial ends</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700/60">
            {subscribers.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-white">{s.email}</td>
                <td className="px-4 py-3 text-white/70">{s.company || "—"}</td>
                <td className="px-4 py-3 text-white/70">{s.plan || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                      STATUS_STYLE[s.subscription_status] || "border-navy-500 bg-navy-800 text-white/50"
                    }`}
                  >
                    {subscriptionStatusLabel(s.subscription_status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/60">{formatDate(s.trial_ends_at)}</td>
                <td className="px-4 py-3 text-white/60">{formatDate(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && subscribers.length === 0 && (
          <p className="py-10 text-center text-white/50">No subscribers yet.</p>
        )}
      </div>
    </div>
  );
}
