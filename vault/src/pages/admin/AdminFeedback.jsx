import { useEffect, useState } from "react";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { fetchFeedback, markFeedbackReviewed } from "../../lib/api/feedback.js";

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminFeedback() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreviewedOnly, setUnreviewedOnly] = useState(true);
  const [markingId, setMarkingId] = useState(null);

  useEffect(() => {
    fetchFeedback()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleMarkReviewed(id) {
    setMarkingId(id);
    try {
      const updated = await markFeedbackReviewed(id);
      setItems((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (e) {
      setError(e.message);
    } finally {
      setMarkingId(null);
    }
  }

  const unreviewedCount = items.filter((f) => f.status === "new").length;
  const filtered = unreviewedOnly ? items.filter((f) => f.status === "new") : items;

  return (
    <div className="container-vault py-10">
      <h1 className="text-3xl font-extrabold text-white">Admin</h1>
      <p className="mt-1 text-white/60">Customer feedback — {items.length} total.</p>

      <div className="mt-6">
        <AdminTabs />
      </div>

      {error && <p className="mt-4 font-semibold text-red-400">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setUnreviewedOnly(true)}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
            unreviewedOnly ? "border-gold-500 bg-gold-500 text-navy-950" : "border-navy-600 bg-navy-800 text-white/70 hover:text-white"
          }`}
        >
          Unreviewed {unreviewedCount > 0 && `(${unreviewedCount})`}
        </button>
        <button
          type="button"
          onClick={() => setUnreviewedOnly(false)}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
            !unreviewedOnly ? "border-gold-500 bg-gold-500 text-navy-950" : "border-navy-600 bg-navy-800 text-white/70 hover:text-white"
          }`}
        >
          All
        </button>
      </div>

      {loading && <p className="mt-6 text-white/60">Loading…</p>}

      <div className="mt-4 space-y-3">
        {filtered.map((f) => (
          <Card key={f.id} className={f.status === "new" ? "border-gold-500/30" : ""}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-white/40">
                  {formatDateTime(f.created_at)}
                  {f.page_context && ` · ${f.page_context}`}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-white">{f.message}</p>
              </div>
              {f.status === "new" ? (
                <Button
                  as="button"
                  type="button"
                  variant="secondary"
                  className="shrink-0 px-3 py-2 text-xs"
                  disabled={markingId === f.id}
                  onClick={() => handleMarkReviewed(f.id)}
                >
                  {markingId === f.id ? "Marking…" : "Mark reviewed"}
                </Button>
              ) : (
                <span className="shrink-0 rounded-full border border-navy-500 bg-navy-800 px-2.5 py-1 text-xs font-bold text-white/50">
                  Reviewed
                </span>
              )}
            </div>
          </Card>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="py-10 text-center text-white/50">
            {unreviewedOnly ? "Nothing unreviewed — good sign." : "No feedback submitted yet."}
          </p>
        )}
      </div>
    </div>
  );
}
