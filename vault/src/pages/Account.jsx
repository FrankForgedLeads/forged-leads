import { useEffect, useState } from "react";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Field.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { createPortalSession } from "../lib/api/billing.js";
import { updateProfile } from "../lib/api/profile.js";
import { fetchMyTeam, inviteTeammate, revokeInvite } from "../lib/api/team.js";
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

function TeamCard({ profile, userId }) {
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyInviteId, setBusyInviteId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function load() {
    setLoading(true);
    return fetchMyTeam(userId)
      .then(({ team, members, pendingInvites }) => {
        setTeam(team);
        setMembers(members);
        setPendingInvites(pendingInvites);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (profile?.plan === "crew") load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.plan, userId]);

  if (profile?.plan !== "crew") return null;
  if (loading) {
    return (
      <Card>
        <h2 className="font-bold text-white">Team</h2>
        <p className="mt-2 text-sm text-white/60">Loading…</p>
      </Card>
    );
  }
  if (!team) {
    return (
      <Card>
        <h2 className="font-bold text-white">Team</h2>
        <p className="mt-2 text-sm text-white/60">
          Your team is being set up — this usually only takes a moment right after subscribing.
          Refresh in a bit if it doesn't appear.
        </p>
      </Card>
    );
  }

  const seatsUsed = members.length + pendingInvites.length;

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setError("");
    setNotice("");
    try {
      const res = await inviteTeammate(inviteEmail.trim());
      setInviteEmail("");
      setNotice(res.warning || "Invite sent.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(invite) {
    setBusyInviteId(invite.id);
    setError("");
    try {
      await revokeInvite(invite.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyInviteId(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white">Team</h2>
        <span className="text-sm text-white/50">
          {seatsUsed} / {team.seat_limit} seats
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between text-sm">
            <span className="text-white">
              {m.email} {m.id === userId && <span className="text-white/40">(you)</span>}
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-gold-500">Member</span>
          </li>
        ))}
        {pendingInvites.map((invite) => (
          <li key={invite.id} className="flex items-center justify-between text-sm">
            <span className="text-white/70">{invite.email}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-white/40">Pending</span>
              <button
                type="button"
                disabled={busyInviteId === invite.id}
                onClick={() => handleRevoke(invite)}
                className="text-xs font-semibold text-red-400 hover:underline disabled:opacity-50"
              >
                Revoke
              </button>
            </div>
          </li>
        ))}
      </ul>

      {seatsUsed < team.seat_limit ? (
        <form onSubmit={handleInvite} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
            />
          </div>
          <Button as="button" type="submit" disabled={inviting} className="px-6 py-3.5 text-sm">
            {inviting ? "Sending…" : "Send invite"}
          </Button>
        </form>
      ) : (
        <p className="mt-5 text-sm text-white/50">
          All {team.seat_limit} seats are used. Revoke a pending invite to free one up.
        </p>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}
      {notice && <p className="mt-3 text-sm font-semibold text-gold-500">{notice}</p>}
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
        <TeamCard profile={profile} userId={user?.id} />
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
