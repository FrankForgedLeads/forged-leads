import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClaim } from "../lib/api/claims.js";
import { useAuth } from "../lib/AuthContext.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select, Textarea } from "../components/ui/Field.jsx";
import { LOSS_TYPES } from "../lib/lossTypes.js";
import { TRADES } from "../lib/trades.js";

export default function NewClaim() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    claim_number: "",
    insured_name: "",
    property_address: "",
    carrier: "",
    adjuster_name: "",
    date_of_loss: "",
    loss_type: "",
    project_type: "",
    trade: "",
    estimate_total: "",
    description: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const cleaned = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
      );
      if (cleaned.estimate_total !== null) cleaned.estimate_total = Number(cleaned.estimate_total);
      const claim = await createClaim(cleaned, user.id);
      navigate(`/claims/${claim.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="container-vault max-w-2xl py-10">
      <h1 className="text-3xl font-extrabold text-white">New review</h1>
      <p className="mt-1 text-white/60">
        Fill in what you know now — you can edit any of this, and upload your estimate and
        documentation, once it's created.
      </p>

      <Card className="mt-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Project type">
              <Input
                value={form.project_type}
                onChange={set("project_type")}
                placeholder="Full roof replacement, kitchen water damage…"
              />
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
            <Input
              value={form.property_address}
              onChange={set("property_address")}
              placeholder="123 Main St, Fort Lauderdale, FL"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Insured / client name">
              <Input value={form.insured_name} onChange={set("insured_name")} placeholder="John Smith" />
            </Field>
            <Field label="Estimate total ($)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.estimate_total}
                onChange={set("estimate_total")}
                placeholder="0.00"
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Date of loss / project date">
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

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Claim number (optional)">
              <Input value={form.claim_number} onChange={set("claim_number")} placeholder="24-0451" />
            </Field>
            <Field label="Carrier (optional)">
              <Input value={form.carrier} onChange={set("carrier")} placeholder="Citizens, Heritage, etc." />
            </Field>
          </div>

          <Field label="Adjuster name (optional)">
            <Input value={form.adjuster_name} onChange={set("adjuster_name")} />
          </Field>

          <Field label="Short description of work">
            <Textarea
              rows={2}
              value={form.description}
              onChange={set("description")}
              placeholder="What's this job, in a sentence or two?"
            />
          </Field>

          <Field label="Notes (optional)">
            <Textarea rows={2} value={form.notes} onChange={set("notes")} />
          </Field>

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button to="/claims" variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button as="button" type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Creating…" : "Create review"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
