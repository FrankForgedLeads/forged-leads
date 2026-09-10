import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { Field, Input, Select, Textarea } from "../../components/ui/Field.jsx";
import { CATEGORIES } from "../../lib/categories.js";
import { fetchItem, createItem, updateItem } from "../../lib/api/adminItems.js";

const BLANK = {
  category: "roofing",
  title: "",
  description: "",
  why_owed: "",
  xactimate_code: "",
  code_citation: "",
  low_amount: "",
  high_amount: "",
  unit: "",
  region_note: "",
  is_active: true,
};

export default function AdminItemForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return;
    fetchItem(id)
      .then((item) => {
        if (!item) {
          setError("Item not found.");
          return;
        }
        setForm({
          category: item.category,
          title: item.title || "",
          description: item.description || "",
          why_owed: item.why_owed || "",
          xactimate_code: item.xactimate_code || "",
          code_citation: item.code_citation || "",
          low_amount: item.low_amount ?? "",
          high_amount: item.high_amount ?? "",
          unit: item.unit || "",
          region_note: item.region_note || "",
          is_active: item.is_active,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  function set(field) {
    return (e) => {
      const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        low_amount: form.low_amount === "" ? null : Number(form.low_amount),
        high_amount: form.high_amount === "" ? null : Number(form.high_amount),
        description: form.description || null,
        why_owed: form.why_owed || null,
        xactimate_code: form.xactimate_code || null,
        code_citation: form.code_citation || null,
        unit: form.unit || null,
        region_note: form.region_note || null,
      };
      if (isNew) {
        await createItem(payload);
      } else {
        await updateItem(id, payload);
      }
      navigate("/admin/items");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container-vault py-10 text-white/60">Loading…</div>;

  return (
    <div className="container-vault max-w-2xl py-10">
      <Link to="/admin/items" className="text-sm text-white/50 hover:text-white">
        ← All items
      </Link>
      <h1 className="mt-1 text-3xl font-extrabold text-white">
        {isNew ? "New item" : "Edit item"}
      </h1>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category">
              <Select value={form.category} onChange={set("category")} required>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Title">
              <Input value={form.title} onChange={set("title")} required />
            </Field>
          </div>

          <Field label="Description">
            <Textarea rows={3} value={form.description} onChange={set("description")} />
          </Field>

          <Field label="Why it's owed">
            <Textarea rows={3} value={form.why_owed} onChange={set("why_owed")} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Xactimate code">
              <Input value={form.xactimate_code} onChange={set("xactimate_code")} />
            </Field>
            <Field label="Code citation">
              <Input value={form.code_citation} onChange={set("code_citation")} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Low amount ($)">
              <Input type="number" min="0" step="0.01" value={form.low_amount} onChange={set("low_amount")} />
            </Field>
            <Field label="High amount ($)">
              <Input type="number" min="0" step="0.01" value={form.high_amount} onChange={set("high_amount")} />
            </Field>
            <Field label="Unit">
              <Input value={form.unit} onChange={set("unit")} placeholder="LF, SF, SQ, EA…" />
            </Field>
          </div>

          <Field label="Region note">
            <Input value={form.region_note} onChange={set("region_note")} placeholder="Optional" />
          </Field>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={set("is_active")}
              className="h-5 w-5 accent-gold-500"
            />
            <span className="text-sm font-semibold text-white/80">
              Active (visible to subscribers in the Vault)
            </span>
          </label>

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button to="/admin/items" variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button as="button" type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : isNew ? "Create item" : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
