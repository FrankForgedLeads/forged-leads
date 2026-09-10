import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClaim } from "../lib/api/claims.js";
import { useAuth } from "../lib/AuthContext.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Field.jsx";
import { LOSS_TYPES } from "../lib/lossTypes.js";

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
      const claim = await createClaim(cleaned, user.id);
      navigate(`/claims/${claim.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="container-vault max-w-2xl py-10">
      <h1 className="text-3xl font-extrabold text-white">New claim</h1>
      <p className="mt-1 text-white/60">
        Fill in what you know now — you can edit any of this later.
      </p>

      <Card className="mt-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Claim number">
              <Input value={form.claim_number} onChange={set("claim_number")} placeholder="24-0451" />
            </Field>
            <Field label="Insured name">
              <Input value={form.insured_name} onChange={set("insured_name")} placeholder="John Smith" />
            </Field>
          </div>

          <Field label="Property address">
            <Input
              value={form.property_address}
              onChange={set("property_address")}
              placeholder="123 Main St, Fort Lauderdale, FL"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Carrier">
              <Input value={form.carrier} onChange={set("carrier")} placeholder="Citizens, Heritage, etc." />
            </Field>
            <Field label="Adjuster name">
              <Input value={form.adjuster_name} onChange={set("adjuster_name")} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
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

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button to="/claims" variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button as="button" type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Creating…" : "Create claim"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
