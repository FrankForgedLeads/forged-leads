import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchActiveItems } from "../lib/api/items.js";
import { fetchClaim } from "../lib/api/claims.js";
import { addClaimItem } from "../lib/api/claimItems.js";
import CategoryFilter from "../components/vault/CategoryFilter.jsx";
import ItemCard from "../components/vault/ItemCard.jsx";
import AddToClaimModal from "../components/vault/AddToClaimModal.jsx";
import Button from "../components/ui/Button.jsx";

function matchesQuery(item, query) {
  if (!query) return true;
  const haystack = [
    item.title,
    item.description,
    item.why_owed,
    item.xactimate_code,
    item.code_citation,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default function Vault() {
  const [searchParams] = useSearchParams();
  const targetClaimId = searchParams.get("claimId");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(null);
  const [modalItem, setModalItem] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [targetClaim, setTargetClaim] = useState(null);

  useEffect(() => {
    fetchActiveItems()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!targetClaimId) {
      setTargetClaim(null);
      return;
    }
    fetchClaim(targetClaimId).then(setTargetClaim).catch(() => setTargetClaim(null));
  }, [targetClaimId]);

  const filtered = useMemo(
    () => items.filter((i) => (!category || i.category === category) && matchesQuery(i, query)),
    [items, category, query],
  );

  async function handleAdd(item) {
    if (targetClaimId) {
      setAddingId(item.id);
      try {
        await addClaimItem({ claimId: targetClaimId, itemId: item.id });
        setAddedIds((prev) => new Set(prev).add(item.id));
      } catch (e) {
        setError(e.message);
      } finally {
        setAddingId(null);
      }
      return;
    }
    setModalItem(item);
  }

  return (
    <div className="container-vault py-10">
      <h1 className="text-3xl font-extrabold text-white">The Vault</h1>
      <p className="mt-1 text-white/60">
        Search what the adjuster left off. {items.length > 0 && `${items.length} items.`}
      </p>

      {targetClaimId && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3">
          <p className="text-sm text-white">
            Adding items to{" "}
            <span className="font-bold">
              {targetClaim?.claim_number || targetClaim?.insured_name || "your claim"}
            </span>
            . Tap any item to add it.
          </p>
          <Button to={`/claims/${targetClaimId}`} variant="secondary" className="px-4 py-2 text-sm">
            Go to claim
          </Button>
        </div>
      )}

      <div className="sticky top-[108px] z-30 -mx-5 mt-6 space-y-3 border-b border-navy-700/60 bg-navy-950/95 px-5 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.42 9.82l3.63 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keyword, code, or citation…"
            className="w-full rounded-xl border border-navy-500 bg-navy-900 py-3.5 pl-11 pr-4 text-base text-white placeholder:text-white/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
        </div>
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      <div className="mt-6">
        {loading && <p className="text-white/60">Loading the Vault…</p>}
        {error && <p className="font-semibold text-red-400">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="py-12 text-center text-white/50">
            No items match "{query}". Try a different keyword or category.
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onAdd={handleAdd}
              adding={addingId === item.id}
              added={addedIds.has(item.id)}
            />
          ))}
        </div>
      </div>

      {modalItem && (
        <AddToClaimModal item={modalItem} onClose={() => setModalItem(null)} />
      )}

      {!targetClaimId && (
        <p className="mt-10 text-center text-sm text-white/40">
          Working a specific claim?{" "}
          <Link to="/claims" className="underline hover:text-white">
            Open it
          </Link>{" "}
          and add items straight from there.
        </p>
      )}
    </div>
  );
}
