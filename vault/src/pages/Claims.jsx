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
          <h1 className="text-3xl font-extrabold text-white">Reviews</h1>
          <p className="mt-1 text-white/60">Every project you're reviewing, in one place.</p>
        </div>
        <Button to="/claims/new">+ New review</Button>
      </div>

      <div className="mt-8">
        {loading && <p className="text-white/60">Loading reviews…</p>}
        {error && <p className="font-semibold text-red-400">{error}</p>}

        {!loading && !error && claims.length === 0 && (
          <Card className="py-12 text-center">
            <p className="text-white/60">No reviews yet.</p>
            <Button to="/claims/new" className="mt-4 inline-flex">
              Start your first review
            </Button>
          </Card>
        )}

        <div className="space-y-3">
          {claims.map((c) => (
            <Link key={c.id} to={`/claims/${c.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 transition hover:border-gold-500/50">
                <div>
                  <p className="font-bold text-white">
                    {c.project_type || c.claim_number || c.insured_name || "Untitled review"}
                  </p>
                  <p className="mt-0.5 text-sm text-white/60">
                    {[c.insured_name, c.property_address].filter(Boolean).join(" · ") || "No details yet"}
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
