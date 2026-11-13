import { useEffect, useMemo, useState } from "react";
import { fetchPriceReferences } from "../lib/api/priceReferences.js";
import CategoryFilter from "../components/vault/CategoryFilter.jsx";
import { categoryLabel } from "../lib/categories.js";

function formatMoney(n) {
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PriceReferenceCard({ row }) {
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-white">{row.description}</h3>
        <span className="shrink-0 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-400">
          {categoryLabel(row.category)}
        </span>
      </div>

      <p className="mt-2 text-2xl font-extrabold text-gold-500">
        {formatMoney(row.price_low)} – {formatMoney(row.price_high)}
        <span className="ml-1 text-sm font-semibold text-white/50">/ {row.unit}</span>
      </p>

      {row.region_note && <p className="mt-1 text-sm text-white/60">{row.region_note}</p>}

      {row.notes && <p className="mt-3 text-sm text-white/70">{row.notes}</p>}

      <div className="mt-4 border-t border-navy-700 pt-3 text-xs text-white/40">
        Source: {row.source_url ? (
          <a href={row.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">
            {row.source_name}
          </a>
        ) : (
          row.source_name
        )}
        {" · "}Checked {new Date(row.last_verified_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

export default function PriceReferences() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(null);

  useEffect(() => {
    fetchPriceReferences()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => !category || r.category === category),
    [rows, category],
  );

  return (
    <div className="container-vault py-10">
      <h1 className="text-3xl font-extrabold text-white">Pricing Reference</h1>
      <p className="mt-1 text-white/60">
        Independent market cost ranges, each tied to a real, named source — not official
        Xactimate or Symbility pricing. Use these as a general sanity check, not an exact quote.
      </p>

      <div className="mt-6">
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      <div className="mt-6">
        {loading && <p className="text-white/60">Loading…</p>}
        {error && <p className="font-semibold text-red-400">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="py-12 text-center text-white/50">No reference data for this category yet.</p>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => (
            <PriceReferenceCard key={row.id} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}
