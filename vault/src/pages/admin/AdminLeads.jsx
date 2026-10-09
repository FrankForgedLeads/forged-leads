import { useEffect, useState } from "react";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import Card from "../../components/ui/Card.jsx";
import { formatCurrency, formatDate } from "../../lib/format.js";
import { fetchLeads, markLeadContacted } from "../../lib/api/adminLeads.js";

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchLeads()
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleContacted(lead) {
    setBusyId(lead.id);
    try {
      const updated = await markLeadContacted(lead.id, !lead.contacted_at);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container-vault py-10">
      <h1 className="text-3xl font-extrabold text-white">Admin</h1>
      <p className="mt-1 text-white/60">Scope Checker leads — {leads.length} total.</p>

      <div className="mt-6">
        <AdminTabs />
      </div>

      {error && <p className="mt-4 font-semibold text-red-400">{error}</p>}
      {loading && <p className="mt-6 text-white/60">Loading…</p>}

      <div className="mt-6 space-y-3">
        {leads.map((lead) => (
          <Card key={lead.id} className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-bold text-white">{lead.name || "(no name)"}</p>
              <p className="text-sm text-white/70">
                <a href={`mailto:${lead.email}`} className="underline hover:text-white">
                  {lead.email}
                </a>
                {lead.phone && ` · ${lead.phone}`}
                {lead.company && ` · ${lead.company}`}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {formatDate(lead.created_at)} · {formatCurrency(lead.estimated_total)} estimated ·{" "}
                {lead.answers?.checked?.length ?? 0} item
                {(lead.answers?.checked?.length ?? 0) === 1 ? "" : "s"} checked
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === lead.id}
              onClick={() => toggleContacted(lead)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
                lead.contacted_at
                  ? "border-gold-500 bg-gold-500 text-navy-950"
                  : "border-navy-500 text-white/70 hover:text-white"
              }`}
            >
              {lead.contacted_at ? `Contacted ${formatDate(lead.contacted_at)}` : "Mark contacted"}
            </button>
          </Card>
        ))}
        {!loading && leads.length === 0 && (
          <Card className="py-10 text-center text-white/50">No leads yet.</Card>
        )}
      </div>
    </div>
  );
}
