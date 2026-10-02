import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import Card from "../../components/ui/Card.jsx";
import { fetchAnalysisRuns } from "../../lib/api/adminAnalysis.js";

const STATUS_STYLE = {
  succeeded: "border-green-500 bg-green-500/10 text-green-400",
  failed: "border-red-500 bg-red-500/10 text-red-400",
  running: "border-gold-500 bg-gold-500/10 text-gold-500",
};

// Cost per review is small (fractions of a cent to a few cents) — the
// shared formatCurrency() rounds to 2 decimals, which would show $0.00 for
// most rows and hide real cost signal. This admin-only view needs more
// precision than anything customer-facing does.
function formatCost(value) {
  if (value === null || value === undefined) return "—";
  return `$${Number(value).toFixed(4)}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function claimLabel(claim) {
  if (!claim) return "Deleted review";
  return claim.project_type || claim.claim_number || claim.insured_name || claim.property_address || "Untitled review";
}

function StatCard({ label, value, sub }) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-1 text-sm text-white/60">{sub}</p>}
    </Card>
  );
}

export default function AdminAnalysis() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [failedOnly, setFailedOnly] = useState(false);
  // Computed once at mount, not on every render — the cutoff doesn't need
  // to track wall-clock time within a single page view.
  const [thirtyDaysAgo] = useState(() => Date.now() - 30 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    fetchAnalysisRuns()
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const recent = runs.filter((r) => new Date(r.started_at).getTime() >= thirtyDaysAgo);
    return {
      total: runs.length,
      failed: runs.filter((r) => r.status === "failed").length,
      cost30d: recent.reduce((sum, r) => sum + (r.estimated_cost_usd || 0), 0),
      count30d: recent.length,
    };
  }, [runs, thirtyDaysAgo]);

  const filtered = useMemo(
    () => (failedOnly ? runs.filter((r) => r.status === "failed") : runs),
    [runs, failedOnly],
  );

  return (
    <div className="container-vault py-10">
      <h1 className="text-3xl font-extrabold text-white">Admin</h1>
      <p className="mt-1 text-white/60">Estimate Review analysis runs — {runs.length} total.</p>

      <div className="mt-6">
        <AdminTabs />
      </div>

      {error && <p className="mt-4 font-semibold text-red-400">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Total runs" value={stats.total} />
        <StatCard label="Failed" value={stats.failed} sub={stats.total > 0 ? `${Math.round((stats.failed / stats.total) * 100)}% of all runs` : undefined} />
        <StatCard label="Runs, last 30 days" value={stats.count30d} />
        <StatCard label="Estimated cost, last 30 days" value={`$${stats.cost30d.toFixed(2)}`} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFailedOnly(false)}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
            !failedOnly ? "border-gold-500 bg-gold-500 text-navy-950" : "border-navy-600 bg-navy-800 text-white/70 hover:text-white"
          }`}
        >
          All runs
        </button>
        <button
          type="button"
          onClick={() => setFailedOnly(true)}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
            failedOnly ? "border-gold-500 bg-gold-500 text-navy-950" : "border-navy-600 bg-navy-800 text-white/70 hover:text-white"
          }`}
        >
          Failed only {stats.failed > 0 && `(${stats.failed})`}
        </button>
      </div>

      {loading && <p className="mt-6 text-white/60">Loading…</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-navy-700/60">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-navy-800/60 text-xs font-bold uppercase tracking-wide text-white/50">
            <tr>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Tokens (in/out)</th>
              <th className="px-4 py-3">Est. cost</th>
              <th className="px-4 py-3">Findings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700/60">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 whitespace-nowrap text-white/60">{formatDateTime(r.started_at)}</td>
                <td className="px-4 py-3 text-white">
                  {r.claim_id ? (
                    <Link to={`/claims/${r.claim_id}`} className="font-semibold text-gold-500 hover:underline">
                      {claimLabel(r.claims)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-white/70">{r.user_email || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                      STATUS_STYLE[r.status] || "border-navy-500 bg-navy-800 text-white/50"
                    }`}
                  >
                    {r.status}
                  </span>
                  {r.status === "failed" && r.error_message && (
                    <p className="mt-1 max-w-xs text-xs text-red-400/80">{r.error_message}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-white/60">{r.model || "—"}</td>
                <td className="px-4 py-3 text-white/60">
                  {r.input_tokens ?? "—"} / {r.output_tokens ?? "—"}
                </td>
                <td className="px-4 py-3 text-white/70">{formatCost(r.estimated_cost_usd)}</td>
                <td className="px-4 py-3 text-white/70">{r.findings_count ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="py-10 text-center text-white/50">
            {failedOnly ? "No failed runs — good sign." : "No analysis runs yet."}
          </p>
        )}
      </div>
    </div>
  );
}
