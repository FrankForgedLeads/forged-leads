import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchClaim, updateClaim } from "../lib/api/claims.js";
import { fetchClaimItems, updateClaimItem, deleteClaimItem } from "../lib/api/claimItems.js";
import {
  fetchReviewFiles,
  uploadReviewFile,
  deleteReviewFile,
  getReviewFileSignedUrl,
  validateReviewFile,
  REVIEW_FILES_MAX_PER_CLAIM,
} from "../lib/api/reviewFiles.js";
import { useAuth } from "../lib/AuthContext.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select, Textarea } from "../components/ui/Field.jsx";
import { formatCurrency, formatRange, formatBytes, midpoint } from "../lib/format.js";
import { categoryLabel } from "../lib/categories.js";
import { LOSS_TYPES } from "../lib/lossTypes.js";
import { TRADES } from "../lib/trades.js";
import { lineTotal, claimTotal } from "../lib/claimMath.js";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "findings_reviewed", label: "Findings Reviewed" },
  { value: "documentation_complete", label: "Documentation Complete" },
  { value: "completed", label: "Completed" },
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
    return <div className="container-vault py-10 text-white/60">Loading review…</div>;
  }

  if (error && !claim) {
    return <div className="container-vault py-10 font-semibold text-red-400">{error}</div>;
  }

  if (!claim) {
    return <div className="container-vault py-10 text-white/60">Review not found.</div>;
  }

  return (
    <div className="container-vault py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/claims" className="text-sm text-white/50 hover:text-white">
            ← All reviews
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            {claim.project_type || claim.claim_number || claim.insured_name || "Untitled review"}
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
          <h2 className="text-lg font-extrabold text-white">Project info</h2>
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
            <InfoRow label="Project type" value={claim.project_type} />
            <InfoRow label="Trade" value={claim.trade} />
            <InfoRow label="Property location" value={claim.property_address} />
            <InfoRow label="Insured / client name" value={claim.insured_name} />
            <InfoRow label="Estimate total" value={claim.estimate_total ? formatCurrency(claim.estimate_total) : null} />
            <InfoRow label="Date of loss" value={claim.date_of_loss} />
            <InfoRow label="Loss type" value={claim.loss_type} />
            <InfoRow label="Claim number" value={claim.claim_number} />
            <InfoRow label="Carrier" value={claim.carrier} />
            <InfoRow label="Adjuster name" value={claim.adjuster_name} />
            <div className="sm:col-span-2">
              <InfoRow label="Description" value={claim.description} />
            </div>
            <div className="sm:col-span-2">
              <InfoRow label="Notes" value={claim.notes} />
            </div>
          </dl>
        )}
      </Card>

      {/* Documents — estimate + supporting documentation upload */}
      <DocumentsSection claimId={id} />

      {/* Attached items — wrapped together with the sticky total bar below so
          the bar's sticky containing block starts here, not at the top of
          the page. Without this wrapper, "sticky bottom-0" pins the bar to
          the viewport bottom from the moment the page is tall enough, even
          while the Documents section above is scrolled into view, hiding
          its upload buttons underneath the bar. */}
      <div className="relative mt-8">
        <div className="flex items-center justify-between">
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
    project_type: claim.project_type || "",
    trade: claim.trade || "",
    property_address: claim.property_address || "",
    insured_name: claim.insured_name || "",
    estimate_total: claim.estimate_total ?? "",
    date_of_loss: claim.date_of_loss || "",
    loss_type: claim.loss_type || "",
    claim_number: claim.claim_number || "",
    carrier: claim.carrier || "",
    adjuster_name: claim.adjuster_name || "",
    description: claim.description || "",
    notes: claim.notes || "",
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
    if (cleaned.estimate_total !== null) cleaned.estimate_total = Number(cleaned.estimate_total);
    await onSave(cleaned);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project type">
          <Input value={form.project_type} onChange={set("project_type")} />
        </Field>
        <Field label="Trade">
          <Select value={form.trade} onChange={set("trade")}>
            <option value="">Select…</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Property location">
        <Input value={form.property_address} onChange={set("property_address")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Insured / client name">
          <Input value={form.insured_name} onChange={set("insured_name")} />
        </Field>
        <Field label="Estimate total ($)">
          <Input type="number" min="0" step="0.01" value={form.estimate_total} onChange={set("estimate_total")} />
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Claim number">
          <Input value={form.claim_number} onChange={set("claim_number")} />
        </Field>
        <Field label="Carrier">
          <Input value={form.carrier} onChange={set("carrier")} />
        </Field>
      </div>
      <Field label="Adjuster name">
        <Input value={form.adjuster_name} onChange={set("adjuster_name")} />
      </Field>
      <Field label="Description">
        <Textarea rows={2} value={form.description} onChange={set("description")} />
      </Field>
      <Field label="Notes">
        <Textarea rows={2} value={form.notes} onChange={set("notes")} />
      </Field>
      <Button as="button" type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : "Save project info"}
      </Button>
    </form>
  );
}

const FILE_TYPE_LABEL = { estimate: "Estimate", photo: "Photo", document: "Document" };

function DocumentsSection({ claimId }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const estimateInputRef = useRef(null);
  const docsInputRef = useRef(null);

  const load = useCallback(() => {
    fetchReviewFiles(claimId)
      .then(setFiles)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [claimId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFiles(fileList, defaultType) {
    const incoming = Array.from(fileList);
    if (files.length + incoming.length > REVIEW_FILES_MAX_PER_CLAIM) {
      setError(`You can attach up to ${REVIEW_FILES_MAX_PER_CLAIM} files per review.`);
      return;
    }
    setError("");
    setUploading(true);
    try {
      for (const file of incoming) {
        const invalidReason = validateReviewFile(file);
        if (invalidReason) {
          setError(`${file.name}: ${invalidReason}`);
          continue;
        }
        const fileType = defaultType === "auto" ? (file.type.startsWith("image/") ? "photo" : "document") : defaultType;
        const row = await uploadReviewFile({ claimId, userId: user.id, file, fileType });
        setFiles((prev) => [...prev, row]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleView(file) {
    try {
      const url = await getReviewFileSignedUrl(file.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(file) {
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    try {
      await deleteReviewFile({ id: file.id, storagePath: file.storage_path });
    } catch (e) {
      setError(e.message);
      load();
    }
  }

  const estimateFiles = files.filter((f) => f.file_type === "estimate");
  const docFiles = files.filter((f) => f.file_type !== "estimate");

  return (
    <div className="mt-8">
      <h2 className="text-lg font-extrabold text-white">Documents</h2>
      <p className="mt-1 text-sm text-white/50">
        More documentation produces a better review — the estimate plus photos, scope notes, or
        measurements.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <h3 className="font-bold text-white">Estimate</h3>
          <p className="mt-1 text-xs text-white/50">Your Xactimate PDF export or other estimate document.</p>
          <FileList files={estimateFiles} loading={loading} onView={handleView} onDelete={handleDelete} />
          <input
            ref={estimateInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files, "estimate");
              e.target.value = "";
            }}
          />
          <Button
            as="button"
            type="button"
            variant="secondary"
            className="mt-4 w-full text-sm"
            disabled={uploading}
            onClick={() => estimateInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload estimate"}
          </Button>
        </Card>

        <Card>
          <h3 className="font-bold text-white">Documentation</h3>
          <p className="mt-1 text-xs text-white/50">
            Photos, scope notes, measurements, invoices — as many as apply.
          </p>
          <FileList files={docFiles} loading={loading} onView={handleView} onDelete={handleDelete} />
          <input
            ref={docsInputRef}
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files, "auto");
              e.target.value = "";
            }}
          />
          <Button
            as="button"
            type="button"
            variant="secondary"
            className="mt-4 w-full text-sm"
            disabled={uploading}
            onClick={() => docsInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload documentation"}
          </Button>
        </Card>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}

      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-navy-900/60">
        <div>
          <p className="font-bold text-white">Run Vault Review</p>
          <p className="mt-1 text-sm text-white/50">
            Coming soon — Vault will compare what's uploaded here against its knowledge base and
            flag scope worth a second look. Your files are saved and ready for it.
          </p>
        </div>
        <Button as="button" type="button" variant="ghost" disabled className="pointer-events-none opacity-50">
          Run Vault Review
        </Button>
      </Card>
    </div>
  );
}

function FileList({ files, loading, onView, onDelete }) {
  if (loading) return <p className="mt-3 text-xs text-white/40">Loading…</p>;
  if (files.length === 0) return <p className="mt-3 text-xs text-white/40">Nothing uploaded yet.</p>;

  return (
    <ul className="mt-3 space-y-2">
      {files.map((f) => (
        <li
          key={f.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-navy-700/60 bg-navy-950/60 px-3 py-2"
        >
          <button
            type="button"
            onClick={() => onView(f)}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-white hover:text-gold-500"
            title={f.file_name}
          >
            {f.file_name}
          </button>
          <span className="shrink-0 text-xs text-white/40">
            {FILE_TYPE_LABEL[f.file_type]} · {formatBytes(f.size_bytes)}
          </span>
          <button
            type="button"
            onClick={() => onDelete(f)}
            aria-label={`Remove ${f.file_name}`}
            className="shrink-0 rounded-md p-1 text-white/40 hover:bg-navy-700 hover:text-red-400"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18 18 6" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
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
