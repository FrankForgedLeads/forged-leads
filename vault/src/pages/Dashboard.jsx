import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchClaims } from "../lib/api/claims.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { formatDate } from "../lib/format.js";
import { daysLeftInTrial } from "../lib/subscription.js";

function TrialBanner({ profile }) {
  if (profile?.subscription_status !== "trialing" || !profile?.trial_ends_at) return null;

  const daysLeft = daysLeftInTrial(profile.trial_ends_at);
  if (daysLeft < 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3">
      <p className="text-sm text-white">
        {daysLeft === 0
          ? "Your free trial ends today."
          : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.`}
      </p>
      <Button to="/account" variant="secondary" className="px-4 py-2 text-sm">
        Manage billing
      </Button>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchClaims()
      .then(setClaims)
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    navigate(`/vault${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  return (
    <div className="container-vault py-10">
      <TrialBanner profile={profile} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-1 text-white/60">{user?.email}</p>
        </div>
        <Button to="/claims/new">+ New Review</Button>
      </div>

      <form onSubmit={handleSearch} className="mt-8">
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.42 9.82l3.63 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the Vault — drip edge, RFG DRIP, FBC R905…"
            className="w-full rounded-xl border border-navy-500 bg-navy-900 py-4 pl-11 pr-4 text-base text-white placeholder:text-white/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </div>
      </form>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-white">Recent reviews</h2>
        {claims.length > 0 && (
          <Link to="/claims" className="text-sm font-semibold text-gold-500 hover:underline">
            View all
          </Link>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {loading && <p className="text-white/60">Loading…</p>}

        {!loading && claims.length === 0 && (
          <Card className="py-10 text-center text-white/60">
            No reviews yet.{" "}
            <Link to="/claims/new" className="font-semibold text-gold-500 hover:underline">
              Start your first one
            </Link>
            .
          </Card>
        )}

        {claims.slice(0, 5).map((c) => (
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
              <span className="text-sm text-white/40">Updated {formatDate(c.updated_at)}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
