import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRemodelEstimate } from "../lib/api/remodelEstimates.js";
import { useAuth } from "../lib/AuthContext.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input } from "../components/ui/Field.jsx";

export default function NewRemodelEstimate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", client_name: "", property_address: "" });
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
      const estimate = await createRemodelEstimate(
        { ...cleaned, title: cleaned.title || "Untitled estimate" },
        user.id,
      );
      navigate(`/remodel/${estimate.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="container-vault max-w-2xl py-10">
      <h1 className="text-3xl font-extrabold text-white">New estimate</h1>
      <p className="mt-1 text-white/60">Add rooms and line items once it's created.</p>

      <Card className="mt-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Estimate title">
            <Input
              value={form.title}
              onChange={set("title")}
              placeholder="Smith kitchen remodel, 123 Main St…"
            />
          </Field>
          <Field label="Client name (optional)">
            <Input value={form.client_name} onChange={set("client_name")} placeholder="John Smith" />
          </Field>
          <Field label="Property address (optional)">
            <Input
              value={form.property_address}
              onChange={set("property_address")}
              placeholder="123 Main St, Fort Lauderdale, FL"
            />
          </Field>

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button to="/remodel" variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button as="button" type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Creating…" : "Create estimate"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
