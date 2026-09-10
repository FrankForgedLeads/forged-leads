import { useState } from "react";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Field.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { createPortalSession } from "../lib/api/billing.js";
import { updateProfile } from "../lib/api/profile.js";
import { daysLeftInTrial, subscriptionStatusLabel } from "../lib/subscription.js";
import { formatDate } from "../lib/format.js";

const PLAN_LABEL = { solo: "Solo", crew: "Crew" };
const ROLES = [
  { value: "roofer", label: "Roofer" },
  { value: "restoration", label: "Restoration contractor" },
  { value: "pa", label: "Public adjuster" },
  { value: "gc", label: "General contractor" },
  { value: "other", label: "Other" },
];

function BillingCard({ profile }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const daysLeft = daysLeftInTrial(profile?.trial_ends_at);

  async function handleManageBilling() {
    setLoading(true);
    setError("");
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="font-bold text-white">Plan &amp; billing</h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-navy-500 px-3 py-1 text-sm font-bold text-white">
          {profile?.plan ? PLAN_LABEL[profile.plan] : "No plan yet"}
        </span>
        <span className="rounded-full bg-gold-500/10 px-3 py-1 text-sm font-bold text-gold-500">
          {subscriptionStatusLabel(profile?.subscription_status)}
        </span>
      </div>

      {profile?.subscription_status === "trialing" && daysLeft !== null && (
        <p className="mt-3 text-sm text-white/60">
          {daysLeft <= 0
            ? "Your trial ends today."
            : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.`}{" "}
          Trial ends {formatDate(profile.trial_ends_at)}.
        </p>
      )}
      {profile?.subscription_status === "past_due" && (
        <p className="mt-3 text-sm text-red-400">
          Your last payment failed. Update your payment method to keep your access active.
        </p>
      )}
      {profile?.subscription_status === "canceled" && (
        <p className="mt-3 text-sm text-white/60">
          Your subscription is canceled.{" "}
          <a href="/subscribe" className="text-gold-500 underline">
            Resubscribe
          </a>{" "}
          any time.
        </p>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}

      <div className="mt-5">
        {profile?.stripe_customer_id ? (
          <Button as="button" type="button" onClick={handleManageBilling} disabled={loading}>
            {loading ? "Opening billing portal…" : "Manage billing"}
          </Button>
        ) : (
          <Button to="/subscribe">Start your 7-day free trial</Button>
        )}
      </div>
    </Card>
  );
}

function TeamCard({ profile }) {
  if (profile?.plan !== "crew") return null;
  return (
    <Card>
      <h2 className="font-bold text-white">Team</h2>
      <p className="mt-2 text-sm text-white/60">
        Your Crew subscription covers up to 5 users. Inviting teammates by email lands in Phase 7
        — for now, share your login email with whoever needs access and we'll get seat invites
        wired up next.
      </p>
    </Card>
  );
}

function ProfileCard({ profile, userId, onSaved }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    company: profile?.company || "",
    phone: profile?.phone || "",
    role: profile?.role || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function set(field) {
    return (e) => {
      setSaved(false);
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const cleaned = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
      );
      await updateProfile(userId, cleaned);
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="font-bold text-white">Profile</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label="Full name">
          <Input value={form.full_name} onChange={set("full_name")} />
        </Field>
        <Field label="Company">
          <Input value={form.company} onChange={set("company")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <Input value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={set("role")}>
              <option value="">Select…</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
        <div className="flex items-center gap-4">
          <Button as="button" type="submit" disabled={saving} className="px-6 py-3">
            {saving ? "Saving…" : "Save profile"}
          </Button>
          {saved && <span className="text-sm font-semibold text-gold-500">Saved.</span>}
        </div>
      </form>
    </Card>
  );
}

export default function Account() {
  const { user, profile, signOut, refreshProfile } = useAuth();

  return (
    <div className="container-vault max-w-2xl py-10">
      <h1 className="text-3xl font-extrabold text-white">Account</h1>
      <p className="mt-1 text-white/60">{user?.email}</p>

      <div className="mt-8 space-y-6">
        <BillingCard profile={profile} />
        <TeamCard profile={profile} />
        <ProfileCard profile={profile} userId={user?.id} onSaved={refreshProfile} />

        <Card>
          <h2 className="font-bold text-white">Log out</h2>
          <p className="mt-2 text-sm text-white/60">Sign out of Beeyond Vault on this device.</p>
          <Button variant="secondary" className="mt-4" onClick={signOut}>
            Log out
          </Button>
        </Card>
      </div>
    </div>
  );
}
