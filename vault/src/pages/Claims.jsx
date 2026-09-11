import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchClaims } from "../lib/api/claims.js";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import { formatDate } from "../lib/format.js";

const STATUS_LABEL = {
  new: "New",
  under_review: "Under Review",
  findings_reviewed: "Findings Reviewed",
  documentation_complete: "Documentation Complete",
  completed: "Completed",
};

export default function Claims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchClaims()
      .then(setClaims)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-vault py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Claims</h1>
          <p className="mt-1 text-white/60">Every claim you're working, in one place.</p>
        </div>
        <Button to="/claims/new">+ New claim</Button>
      </div>

      <div className="mt-8">
        {loading && <p className="text-white/60">Loading claims…</p>}
        {error && <p className="font-semibold text-red-400">{error}</p>}

        {!loading && !error && claims.length === 0 && (
          <Card className="py-12 text-center">
            <p className="text-white/60">No claims yet.</p>
            <Button to="/claims/new" className="mt-4 inline-flex">
              Start your first claim
            </Button>
          </Card>
        )}

        <div className="space-y-3">
          {claims.map((c) => (
            <Link key={c.id} to={`/claims/${c.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 transition hover:border-gold-500/50">
                <div>
                  <p className="font-bold text-white">
                    {c.claim_number || c.insured_name || "Untitled claim"}
                  </p>
                  <p className="mt-0.5 text-sm text-white/60">
                    {[c.insured_name, c.carrier].filter(Boolean).join(" · ") || "No details yet"}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="rounded-full border border-navy-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/70">
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  <span className="text-white/40">Updated {formatDate(c.updated_at)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
