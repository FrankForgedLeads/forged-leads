import { useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input } from "../components/ui/Field.jsx";
import { SCOPE_CHECKLIST, checklistTotal } from "../lib/scopeChecklist.js";
import { formatCurrency } from "../lib/format.js";
import { submitScopeCheckerLead } from "../lib/api/leads.js";

export default function ScopeChecker() {
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(() => checklistTotal(checkedIds), [checkedIds]);
  const checkedCount = checkedIds.size;

  function toggle(id) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const checkedItems = SCOPE_CHECKLIST.filter((i) => checkedIds.has(i.id));
      await submitScopeCheckerLead({ ...form, checkedItems, total });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="border-b border-navy-700/60 bg-gradient-to-b from-navy-900 to-navy-950">
        <div className="container-vault flex flex-col items-center gap-5 py-16 text-center sm:py-20">
          <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-gold-500">
            Free tool — no account needed
          </span>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            12 things worth double-checking on your estimate
          </h1>
          <p className="max-w-xl text-lg text-white/70">
            Check what applies to your job and watch the number build. This is a rough, typical
            estimate for review, not a guarantee — the full Vault reviews your actual estimate and
            documentation against a much larger knowledge base.
          </p>
        </div>
      </section>

      <section className="container-vault py-10">
        <div className="grid gap-3">
          {SCOPE_CHECKLIST.map((item) => {
            const checked = checkedIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className="text-left"
              >
                <Card
                  className={`flex items-start gap-4 transition ${
                    checked ? "border-gold-500/70 bg-gold-500/5" : "hover:border-navy-500"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                      checked ? "border-gold-500 bg-gold-500" : "border-navy-500"
                    }`}
                    aria-hidden="true"
                  >
                    {checked && (
                      <svg viewBox="0 0 20 20" className="h-4 w-4 text-navy-950" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.3 9.5a1 1 0 1 1 1.4-1.4l3.6 3.6 6.7-6.7a1 1 0 0 1 1.4 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="font-bold text-white">{item.label}</span>
                      <span className="font-extrabold text-gold-500">
                        {formatCurrency(item.amount)}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-white/60">{item.note}</span>
                  </span>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Running total */}
        <div className="sticky bottom-0 z-20 mt-6 -mx-5 border-t border-navy-700/60 bg-navy-900/95 px-5 py-5 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/50">
                {checkedCount} of {SCOPE_CHECKLIST.length} checked
              </p>
              <p className="text-3xl font-extrabold text-gold-500">{formatCurrency(total)}</p>
            </div>
            <p className="max-w-xs text-sm text-white/60">
              potential review amount on a typical job — not a guarantee.
            </p>
          </div>
        </div>

        {/* Lead capture / CTA */}
        <div className="mx-auto mt-10 max-w-lg">
          {submitted ? (
            <Card className="text-center">
              <h2 className="text-xl font-extrabold text-white">
                Potential review amount: {formatCurrency(total)}
              </h2>
              <p className="mt-3 text-white/70">
                That's a rough estimate from {checkedCount} checked item{checkedCount === 1 ? "" : "s"} on
                a 12-item checklist — this is not a guarantee of payment or claim outcome. Run
                your actual estimate through Vault for a full review against the knowledge base
                behind these numbers.
              </p>
              <Button to="/pricing" className="mt-6 w-full">
                Run My First Review
              </Button>
            </Card>
          ) : (
            <Card>
              <h2 className="text-xl font-extrabold text-white">See where this number comes from</h2>
              <p className="mt-2 text-sm text-white/60">
                Enter your info and we'll show you the full breakdown — plus what else is
                probably missing from your estimate.
              </p>
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <Field label="Name">
                  <Input value={form.name} onChange={set("name")} placeholder="Jane Roofer" />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={set("email")}
                    placeholder="you@yourcompany.com"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone">
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="(954) 555-0100"
                    />
                  </Field>
                  <Field label="Company">
                    <Input value={form.company} onChange={set("company")} placeholder="Your Roofing LLC" />
                  </Field>
                </div>
                {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
                <Button as="button" type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Submitting…" : "Show my results"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
