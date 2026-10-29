import { useEffect, useMemo, useState } from "react";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import Card from "../../components/ui/Card.jsx";
import { fetchUsageData } from "../../lib/api/adminUsage.js";

function StatCard({ label, value, sub }) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-1 text-sm text-white/60">{sub}</p>}
    </Card>
  );
}

function pct(numerator, denominator) {
  if (!denominator) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default function AdminUsage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // Computed once at mount, not on every render — same fix as AdminAnalysis's
  // 30-day cutoff (see README's Phase 9 partial notes): Date.now() called
  // directly inside useMemo's body is an impure render, flagged by oxlint.
  const [thirtyDaysAgo] = useState(() => Date.now() - 30 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    fetchUsageData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const { events, profiles, claims } = data;

    const usersByEvent = (name) => new Set(events.filter((e) => e.event_name === name).map((e) => e.user_id));
    const trialStarted = usersByEvent("trial_started");
    const subscriptionStarted = usersByEvent("subscription_started");

    const usersWithAReview = new Set(claims.map((c) => c.user_id));
    // Of everyone who ever started a trial, what fraction ever created at
    // least one review — the spec's single most important metric.
    const trialUsersWithReview = [...trialStarted].filter((id) => usersWithAReview.has(id));

    // Of everyone who ever started a trial, what fraction ever converted
    // to a paid (non-trialing) subscription. Approximate by design — see
    // the README note — but a fair proxy without needing full event
    // ordering/cohort logic for a v1 admin view.
    const trialUsersConverted = [...trialStarted].filter((id) => subscriptionStarted.has(id));

    const payingCustomers = profiles.filter((p) => ["trialing", "active"].includes(p.subscription_status));
    const reviewsLast30d = claims.filter((c) => new Date(c.created_at).getTime() >= thirtyDaysAgo);

    return {
      signups: profiles.length,
      trialStartedCount: trialStarted.size,
      firstReviewRate: pct(trialUsersWithReview.length, trialStarted.size),
      conversionRate: pct(trialUsersConverted.length, trialStarted.size),
      payingCustomers: payingCustomers.length,
      reviewsPerCustomer30d: payingCustomers.length
        ? (reviewsLast30d.length / payingCustomers.length).toFixed(1)
        : "—",
      estimateUploads: events.filter((e) => e.event_name === "estimate_uploaded").length,
      findingsAdded: events.filter((e) => e.event_name === "findings_added").length,
    };
  }, [data, thirtyDaysAgo]);

  return (
    <div className="container-vault py-10">
      <h1 className="text-3xl font-extrabold text-white">Admin</h1>
      <p className="mt-1 text-white/60">Signup, trial, and review-completion funnel.</p>

      <div className="mt-6">
        <AdminTabs />
      </div>

      {error && <p className="mt-4 font-semibold text-red-400">{error}</p>}
      {loading && <p className="mt-6 text-white/60">Loading…</p>}

      {stats && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Signups (all time)" value={stats.signups} />
            <StatCard label="Trials started" value={stats.trialStartedCount} />
            <StatCard label="Currently trialing or active" value={stats.payingCustomers} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Trial → first review"
              value={stats.firstReviewRate}
              sub="Of trial users, % who ever started a review — the single most important metric per the product plan"
            />
            <StatCard
              label="Trial → paid conversion"
              value={stats.conversionRate}
              sub="Of trial users, % who ever converted to a paid subscription"
            />
            <StatCard
              label="Reviews per paying customer"
              value={stats.reviewsPerCustomer30d}
              sub="Last 30 days, per currently trialing/active customer"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StatCard label="Estimates uploaded (all time)" value={stats.estimateUploads} />
            <StatCard label="Findings added to a review (all time)" value={stats.findingsAdded} />
          </div>

          <p className="mt-6 text-xs leading-relaxed text-white/40">
            "Trial → paid conversion" counts a user as converted if they ever logged a
            subscription_started event, regardless of order relative to trial_started — a simple,
            honest approximation rather than full cohort/event-ordering analysis, appropriate for a
            single-operator admin view. Cross-check against Subscribers for the current point-in-time
            breakdown.
          </p>
        </>
      )}
    </div>
  );
}
