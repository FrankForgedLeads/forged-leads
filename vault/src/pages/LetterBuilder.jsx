import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchClaim } from "../lib/api/claims.js";
import { fetchClaimItems } from "../lib/api/claimItems.js";
import { createLetterRecord } from "../lib/api/letters.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { LETTER_TEMPLATES } from "../lib/letters/templates.js";
import { generateLetterPdf } from "../lib/letters/pdf.js";
import { unitAmount, lineTotal, claimTotal } from "../lib/claimMath.js";
import { formatDate } from "../lib/format.js";
import { VAULT_DISCLAIMER } from "../lib/disclaimer.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Textarea } from "../components/ui/Field.jsx";
import LetterPreview from "../components/letters/LetterPreview.jsx";

function todayLong() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function buildInitialFields(claim, profile, user) {
  return {
    companyName: profile?.company || profile?.full_name || "",
    contactName: profile?.full_name || "",
    contactPhone: profile?.phone || "",
    contactEmail: profile?.email || user?.email || "",
    letterDate: todayLong(),
    carrier: claim?.carrier || "",
    adjusterName: claim?.adjuster_name || "",
    claimNumber: claim?.claim_number || "",
    insuredName: claim?.insured_name || "",
    propertyAddress: claim?.property_address || "",
    dateOfLoss: claim?.date_of_loss ? formatDate(claim.date_of_loss) : "",
    originalDate: "",
    approvedAmount: "",
    additionalNote: "",
  };
}

export default function LetterBuilder() {
  const { id } = useParams();
  const { profile, user } = useAuth();

  const [claim, setClaim] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [step, setStep] = useState("choose");
  const [templateKey, setTemplateKey] = useState(null);
  const [fields, setFields] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportedOk, setExportedOk] = useState(false);

  useEffect(() => {
    Promise.all([fetchClaim(id), fetchClaimItems(id)])
      .then(([claimData, itemRows]) => {
        setClaim(claimData);
        setRows(itemRows);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const itemRows = useMemo(
    () =>
      rows.map((r) => ({
        title: r.items?.title,
        code: r.items?.xactimate_code,
        citation: r.items?.code_citation,
        quantity: r.quantity,
        unit: r.items?.unit,
        unitAmount: unitAmount(r),
        lineTotal: lineTotal(r),
        note: r.note,
      })),
    [rows],
  );

  const total = useMemo(() => claimTotal(rows), [rows]);

  function chooseTemplate(key) {
    setTemplateKey(key);
    setFields(buildInitialFields(claim, profile, user));
    setExportedOk(false);
    setStep("edit");
  }

  function set(field) {
    return (e) => setFields((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const doc = await generateLetterPdf({ templateKey, fields: { ...fields, total }, itemRows });
      const claimLabel = claim.claim_number || claim.insured_name || "claim";
      const templateLabel = LETTER_TEMPLATES.find((t) => t.key === templateKey)?.name ?? templateKey;
      doc.save(`Letter - ${claimLabel} - ${templateLabel}.pdf`);

      await createLetterRecord({
        claimId: id,
        templateKey,
        pdfMeta: { fields, itemRows, total, generatedAt: new Date().toISOString() },
      });
      setExportedOk(true);
    } catch (e) {
      setError(`PDF downloaded, but we couldn't save a record of it: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="container-vault py-10 text-white/60">Loading…</div>;
  if (!claim) return <div className="container-vault py-10 text-white/60">Review not found.</div>;

  return (
    <div className="container-vault py-10">
      <Link to={`/claims/${id}`} className="text-sm text-white/50 hover:text-white">
        ← Back to review
      </Link>
      <h1 className="mt-1 text-3xl font-extrabold text-white">Generate a letter</h1>
      <p className="mt-1 text-white/60">
        For {claim.project_type || claim.claim_number || claim.insured_name || "this review"} —{" "}
        {itemRows.length} item
        {itemRows.length === 1 ? "" : "s"} attached.
      </p>

      {step === "choose" ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {LETTER_TEMPLATES.map((t) => (
            <button key={t.key} type="button" onClick={() => chooseTemplate(t.key)} className="text-left">
              <Card className="h-full transition hover:border-gold-500/60">
                <h3 className="font-extrabold text-white">{t.name}</h3>
                <p className="mt-2 text-sm text-white/60">{t.description}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-gold-500">
                  Use this template →
                </span>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Editable fields */}
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="text-sm font-semibold text-gold-500 hover:underline"
            >
              ← Change template
            </button>

            <Card>
              <h2 className="font-bold text-white">Your company</h2>
              <div className="mt-4 space-y-4">
                <Field label="Company name">
                  <Input value={fields.companyName} onChange={set("companyName")} />
                </Field>
                <Field label="Contact name">
                  <Input value={fields.contactName} onChange={set("contactName")} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone">
                    <Input value={fields.contactPhone} onChange={set("contactPhone")} />
                  </Field>
                  <Field label="Email">
                    <Input value={fields.contactEmail} onChange={set("contactEmail")} />
                  </Field>
                </div>
                <Field label="Letter date">
                  <Input value={fields.letterDate} onChange={set("letterDate")} />
                </Field>
              </div>
            </Card>

            <Card>
              <h2 className="font-bold text-white">Recipient &amp; claim reference</h2>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Carrier">
                    <Input value={fields.carrier} onChange={set("carrier")} />
                  </Field>
                  <Field label="Adjuster name">
                    <Input value={fields.adjusterName} onChange={set("adjusterName")} />
                  </Field>
                </div>
                <Field label="Claim number">
                  <Input value={fields.claimNumber} onChange={set("claimNumber")} />
                </Field>
                <Field label="Insured name">
                  <Input value={fields.insuredName} onChange={set("insuredName")} />
                </Field>
                <Field label="Property address">
                  <Input value={fields.propertyAddress} onChange={set("propertyAddress")} />
                </Field>
                <Field label="Date of loss">
                  <Input value={fields.dateOfLoss} onChange={set("dateOfLoss")} />
                </Field>
              </div>
            </Card>

            {templateKey === "follow_up_no_response" && (
              <Card>
                <Field label="Date of original letter">
                  <Input
                    value={fields.originalDate}
                    onChange={set("originalDate")}
                    placeholder="e.g. August 12, 2026"
                  />
                </Field>
              </Card>
            )}

            {templateKey === "response_to_partial_approval" && (
              <Card>
                <Field label="Approved amount (optional)">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fields.approvedAmount}
                    onChange={set("approvedAmount")}
                    placeholder="0.00"
                  />
                </Field>
              </Card>
            )}

            <Card>
              <Field label="Additional note (optional)">
                <Textarea
                  rows={4}
                  value={fields.additionalNote}
                  onChange={set("additionalNote")}
                  placeholder="Anything else specific to this review you want included."
                />
              </Field>
            </Card>

            <p className="text-xs leading-relaxed text-white/40">{VAULT_DISCLAIMER}</p>

            {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
            {exportedOk && (
              <p className="text-sm font-semibold text-gold-500">
                PDF downloaded and saved to this review.
              </p>
            )}

            <Button as="button" type="button" onClick={handleExport} disabled={exporting} className="w-full">
              {exporting ? "Generating…" : "Export PDF"}
            </Button>
          </div>

          {/* Live preview */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <LetterPreview templateKey={templateKey} fields={fields} itemRows={itemRows} total={total} />
          </div>
        </div>
      )}
    </div>
  );
}
