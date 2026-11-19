import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRemodelEstimates } from "../lib/api/remodelEstimates.js";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import { formatDate } from "../lib/format.js";

export default function RemodelEstimates() {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRemodelEstimates()
      .then(setEstimates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-vault py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Remodel estimates</h1>
          <p className="mt-1 text-white/60">
            Build a from-scratch estimate by room, without Xactimate or Symbility.
          </p>
        </div>
        <Button to="/remodel/new">+ New estimate</Button>
      </div>

      <div className="mt-8">
        {loading && <p className="text-white/60">Loading estimates…</p>}
        {error && <p className="font-semibold text-red-400">{error}</p>}

        {!loading && !error && estimates.length === 0 && (
          <Card className="py-12 text-center">
            <p className="text-white/60">No estimates yet.</p>
            <Button to="/remodel/new" className="mt-4 inline-flex">
              Start your first estimate
            </Button>
          </Card>
        )}

        <div className="space-y-3">
          {estimates.map((est) => (
            <Link key={est.id} to={`/remodel/${est.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 transition hover:border-gold-500/50">
                <div>
                  <p className="font-bold text-white">{est.title || "Untitled estimate"}</p>
                  <p className="mt-0.5 text-sm text-white/60">
                    {[est.client_name, est.property_address].filter(Boolean).join(" · ") ||
                      "No details yet"}
                  </p>
                </div>
                <span className="text-sm text-white/40">Updated {formatDate(est.updated_at)}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
