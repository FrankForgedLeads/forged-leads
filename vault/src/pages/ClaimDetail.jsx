import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchClaim, updateClaim } from "../lib/api/claims.js";
import { fetchClaimItems, updateClaimItem, deleteClaimItem } from "../lib/api/claimItems.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Field.jsx";
import { formatCurrency, formatRange, midpoint } from "../lib/format.js";
import { categoryLabel } from "../lib/categories.js";
import { LOSS_TYPES } from "../lib/lossTypes.js";
import { lineTotal, claimTotal } from "../lib/claimMath.js";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "partially_approved", label: "Partially Approved" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function ClaimDetail() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingInfo, setEditingInfo] = useState(false);

  const load = useCallback(async () => {
    const [claimData, itemRows] = await Promise.all([fetchClaim(id), fetchClaimItems(id)]);
    setClaim(claimData);
    setRows(itemRows);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load]);

  const total = useMemo(() => claimTotal(rows), [rows]);

  async function handleStatusChange(e) {
    const status = e.target.value;
    setClaim((c) => ({ ...c, status }));
    await updateClaim(id, { status }).catch((err) => setError(err.message));
  }

  function updateRowLocal(rowId, fields) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...fields } : r)));
  }

  async function persistRow(row) {
    try {
      await updateClaimItem(row.id, {
        quantity: Number(row.quantity) || 0,
        custom_amount: row.custom_amount === "" ? null : row.custom_amount,
        note: row.note,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(rowId) {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    try {
      await deleteClaimItem(rowId);
    } catch (err) {
      setError(err.message);
      load();
    }
  }

  if (loading) {
    return <div className="container-vault py-10 text-white/60">Loading claim…</div>;
  }

  if (error && !claim) {
    return <div className="container-vault py-10 font-semibold text-red-400">{error}</div>;
  }

  if (!claim) {
    return <div className="container-vault py-10 text-white/60">Claim not found.</div>;
  }

  return (
    <div className="container-vault py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/claims" className="text-sm text-white/50 hover:text-white">
            ← All claims
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            {claim.claim_number || claim.insured_name || "Untitled claim"}
          </h1>
        </div>
        <div className="w-full sm:w-48">
          <Select value={claim.status} onChange={handleStatusChange}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Claim info */}
      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white">Claim info</h2>
          <button
            type="button"
            onClick={() => setEditingInfo((v) => !v)}
            className="text-sm font-semibold text-gold-500 hover:underline"
          >
            {editingInfo ? "Done" : "Edit"}
          </button>
        </div>

        {editingInfo ? (
          <ClaimInfoForm
            claim={claim}
            onSave={async (fields) => {
              const updated = await updateClaim(id, fields);
              setClaim(updated);
              setEditingInfo(false);
            }}
          />
        ) : (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoRow label="Insured name" value={claim.insured_name} />
            <InfoRow label="Property address" value={claim.property_address} />
            <InfoRow label="Carrier" value={claim.carrier} />
            <InfoRow label="Adjuster name" value={claim.adjuster_name} />
            <InfoRow label="Date of loss" value={claim.date_of_loss} />
            <InfoRow label="Loss type" value={claim.loss_type} />
          </dl>
        )}
      </Card>

      {/* Attached items */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-white">Attached items ({rows.length})</h2>
        <Button to={`/vault?claimId=${id}`} variant="secondary" className="px-4 py-2.5 text-sm">
          + Add from Vault
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="mt-4 py-10 text-center text-white/50">
          Nothing attached yet. Add items from the Vault to start building this claim's total.
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <ClaimItemRow
              key={row.id}
              row={row}
              onLocalChange={(fields) => updateRowLocal(row.id, fields)}
              onBlurSave={() => persistRow(row)}
              onRemove={() => handleRemove(row.id)}
            />
          ))}
        </div>
      )}

      {/* Running total */}
      <div className="sticky bottom-0 z-20 mt-8 -mx-5 border-t border-navy-700/60 bg-navy-900/95 px-5 py-5 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-white/50">
              Running total
            </p>
            <p className="text-3xl font-extrabold text-gold-500">{formatCurrency(total)}</p>
          </div>
          <Button
            to={`/claims/${id}/letter`}
            variant={rows.length === 0 ? "ghost" : "primary"}
            className={rows.length === 0 ? "pointer-events-none opacity-40" : ""}
            aria-disabled={rows.length === 0}
          >
            Generate letter
          </Button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-400">{error}</p>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-white/40">{label}</dt>
      <dd className="mt-1 text-sm text-white">{value || "—"}</dd>
    </div>
  );
}

function ClaimInfoForm({ claim, onSave }) {
  const [form, setForm] = useState({
    insured_name: claim.insured_name || "",
    property_address: claim.property_address || "",
    carrier: claim.carrier || "",
    adjuster_name: claim.adjuster_name || "",
    date_of_loss: claim.date_of_loss || "",
    loss_type: claim.loss_type || "",
    claim_number: claim.claim_number || "",
  });
  const [saving, setSaving] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const cleaned = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
    );
    await onSave(cleaned);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Claim number">
          <Input value={form.claim_number} onChange={set("claim_number")} />
        </Field>
        <Field label="Insured name">
          <Input value={form.insured_name} onChange={set("insured_name")} />
        </Field>
      </div>
      <Field label="Property address">
        <Input value={form.property_address} onChange={set("property_address")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Carrier">
          <Input value={form.carrier} onChange={set("carrier")} />
        </Field>
        <Field label="Adjuster name">
          <Input value={form.adjuster_name} onChange={set("adjuster_name")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of loss">
          <Input type="date" value={form.date_of_loss} onChange={set("date_of_loss")} />
        </Field>
        <Field label="Loss type">
          <Select value={form.loss_type} onChange={set("loss_type")}>
            <option value="">Select…</option>
            {LOSS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button as="button" type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : "Save claim info"}
      </Button>
    </form>
  );
}

function ClaimItemRow({ row, onLocalChange, onBlurSave, onRemove }) {
  const item = row.items;
  const unitPlaceholder = midpoint(item?.low_amount, item?.high_amount);
  const total = lineTotal(row);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full border border-navy-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white/50">
            {categoryLabel(item?.category)}
          </span>
          <h3 className="mt-1.5 font-bold text-white">{item?.title}</h3>
          <p className="text-xs text-white/50">
            {[item?.xactimate_code, item?.code_citation].filter(Boolean).join(" · ")}
          </p>
          <p className="text-xs text-white/40">
            Typical: {formatRange(item?.low_amount, item?.high_amount, item?.unit)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove item"
          className="shrink-0 rounded-lg p-2 text-white/40 hover:bg-navy-700 hover:text-red-400"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18 18 6" />
          </svg>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Qty">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={row.quantity}
            onChange={(e) => onLocalChange({ quantity: e.target.value })}
            onBlur={onBlurSave}
          />
        </Field>
        <Field label={`$ / ${item?.unit || "unit"}`}>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder={unitPlaceholder.toFixed(2)}
            value={row.custom_amount ?? ""}
            onChange={(e) =>
              onLocalChange({ custom_amount: e.target.value === "" ? null : Number(e.target.value) })
            }
            onBlur={onBlurSave}
          />
        </Field>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Note">
            <Input
              value={row.note || ""}
              onChange={(e) => onLocalChange({ note: e.target.value })}
              onBlur={onBlurSave}
              placeholder="Optional"
            />
          </Field>
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-xs font-bold uppercase tracking-wide text-white/40">Line total</p>
          <p className="text-lg font-extrabold text-white">{formatCurrency(total)}</p>
        </div>
      </div>
    </Card>
  );
}
