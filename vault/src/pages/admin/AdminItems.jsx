import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminTabs from "../../components/admin/AdminTabs.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import CategoryFilter from "../../components/vault/CategoryFilter.jsx";
import { categoryLabel } from "../../lib/categories.js";
import { formatRange, formatDate } from "../../lib/format.js";
import { fetchAllItemsForAdmin, updateItem, deleteItem } from "../../lib/api/adminItems.js";

export default function AdminItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    return fetchAllItemsForAdmin()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((i) => {
      if (category && i.category !== category) return false;
      if (!q) return true;
      return [i.title, i.xactimate_code, i.code_citation].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [items, category, query]);

  async function toggleActive(item) {
    setBusyId(item.id);
    setError("");
    try {
      await updateItem(item.id, { is_active: !item.is_active });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Permanently delete "${item.title}"? This can't be undone.`)) return;
    setBusyId(item.id);
    setError("");
    try {
      await deleteItem(item.id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container-vault py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Admin</h1>
          <p className="mt-1 text-white/60">
            Vault items — {items.length} total
            {items.length > 0 &&
              ` · ${items.filter((i) => !i.last_verified_date).length} not yet verified`}
            .
          </p>
        </div>
        <Button to="/admin/items/new">+ New item</Button>
      </div>

      <div className="mt-6">
        <AdminTabs />
      </div>

      <div className="mt-6 space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, code, citation…"
          className="w-full rounded-xl border border-navy-500 bg-navy-900 px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
        />
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      {error && <p className="mt-4 font-semibold text-red-400">{error}</p>}
      {loading && <p className="mt-6 text-white/60">Loading…</p>}

      <div className="mt-6 space-y-3">
        {filtered.map((item) => (
          <Card key={item.id} className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-navy-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white/50">
                  {categoryLabel(item.category)}
                </span>
                {!item.is_active && (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-400">
                    Inactive
                  </span>
                )}
                {item.last_verified_date ? (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400">
                    Verified {formatDate(item.last_verified_date)}
                  </span>
                ) : (
                  <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gold-500">
                    Not yet verified
                  </span>
                )}
              </div>
              <p className="mt-1 font-bold text-white">{item.title}</p>
              <p className="text-xs text-white/50">
                {[item.xactimate_code, item.code_citation].filter(Boolean).join(" · ")} ·{" "}
                {formatRange(item.low_amount, item.high_amount, item.unit)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button to={`/admin/items/${item.id}`} variant="secondary" className="px-4 py-2 text-sm">
                Edit
              </Button>
              <Button
                as="button"
                type="button"
                variant="ghost"
                className="px-4 py-2 text-sm"
                disabled={busyId === item.id}
                onClick={() => toggleActive(item)}
              >
                {item.is_active ? "Deactivate" : "Activate"}
              </Button>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => handleDelete(item)}
                className="rounded-lg p-2 text-white/40 hover:bg-navy-700 hover:text-red-400 disabled:opacity-50"
                aria-label="Delete item"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18 18 6" />
                </svg>
              </button>
            </div>
          </Card>
        ))}
        {!loading && filtered.length === 0 && (
          <Card className="py-10 text-center text-white/50">No items match.</Card>
        )}
      </div>

      <p className="mt-8 text-xs text-white/40">
        <Link to="/vault" className="underline hover:text-white">
          View the Vault
        </Link>{" "}
        to see how items render for subscribers.
      </p>
    </div>
  );
}
