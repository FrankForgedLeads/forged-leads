import { useEffect, useState } from "react";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { Field, Input, Textarea } from "../../components/ui/Field.jsx";
import { fetchAllItemsForAdmin } from "../../lib/api/adminItems.js";
import { fetchSubscribers } from "../../lib/api/adminSubscribers.js";
import { sendMonthlyUpdate } from "../../lib/api/monthlyUpdate.js";
import { formatRange } from "../../lib/format.js";
import { VAULT_DISCLAIMER } from "../../lib/disclaimer.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function draftBody(recentItems) {
  const rows = recentItems
    .map(
      (i) =>
        `<li><strong>${escapeHtml(i.title)}</strong> — ${escapeHtml(formatRange(i.low_amount, i.high_amount, i.unit))}${
          i.code_citation ? ` (${escapeHtml(i.code_citation)})` : ""
        }</li>`,
    )
    .join("");

  return [
    "<p>Here's what's new in the Vault this month:</p>",
    rows ? `<ul>${rows}</ul>` : "<p>(No new or updated items to list yet — edit this before sending.)</p>",
    "<p>Log in to search the full Vault and attach anything relevant to your open claims.</p>",
    `<p style="font-size:12px;color:#888;margin-top:24px;">${escapeHtml(VAULT_DISCLAIMER)}</p>`,
  ].join("\n");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export default function AdminMonthlyUpdate() {
  const [recipientCount, setRecipientCount] = useState(null);
  const [subject, setSubject] = useState("What's new in Beeyond Vault this month");
  const [bodyHtml, setBodyHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    Promise.all([fetchAllItemsForAdmin(), fetchSubscribers()])
      .then(([items, subscribers]) => {
        const recent = items.filter(
          (i) => i.is_active && new Date(i.updated_at).getTime() > Date.now() - THIRTY_DAYS_MS,
        );
        setBodyHtml(draftBody(recent));
        setRecipientCount(
          subscribers.filter((s) => ["trialing", "active"].includes(s.subscription_status)).length,
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSend() {
    if (!window.confirm(`Send this email to ${recipientCount} subscriber(s) now?`)) return;
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await sendMonthlyUpdate(subject, bodyHtml);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container-vault max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold text-white">Admin</h1>
      <p className="mt-1 text-white/60">Monthly update email to trialing/active subscribers.</p>

      <div className="mt-6">
        <AdminTabs />
      </div>

      {loading ? (
        <p className="mt-6 text-white/60">Loading…</p>
      ) : (
        <Card className="mt-6">
          <p className="text-sm text-white/60">
            Drafted from Vault items added or updated in the last 30 days — edit anything before
            sending. This goes out via Resend to{" "}
            <strong className="text-white">{recipientCount} subscriber(s)</strong> (trialing or
            active).
          </p>

          <div className="mt-5 space-y-4">
            <Field label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="Body (HTML)">
              <Textarea
                rows={14}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                className="font-mono text-sm"
              />
            </Field>
          </div>

          {error && <p className="mt-4 text-sm font-semibold text-red-400">{error}</p>}
          {result && (
            <p className="mt-4 text-sm font-semibold text-gold-500">
              Sent to {result.sent} subscriber(s).
            </p>
          )}

          <Button
            as="button"
            type="button"
            onClick={handleSend}
            disabled={sending || !recipientCount}
            className="mt-6"
          >
            {sending ? "Sending…" : `Send to ${recipientCount ?? 0} subscribers`}
          </Button>
        </Card>
      )}
    </div>
  );
}
