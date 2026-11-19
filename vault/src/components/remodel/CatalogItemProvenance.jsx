import { formatCurrency } from "../../lib/format.js";

// Shows a catalog item's price range, source, and last-verified date right
// where it's picked — remodel_items already carries all three (source_name,
// source_url, last_verified_date, price_low/price_high); this just makes
// them visible instead of silently available only via a direct DB lookup.
export default function CatalogItemProvenance({ item }) {
  if (!item) return null;
  return (
    <p className="mt-1 text-xs text-white/40">
      {item.price_low != null && item.price_high != null && (
        <>
          {formatCurrency(item.price_low)}–{formatCurrency(item.price_high)}/{item.unit}
          {" · "}
        </>
      )}
      {item.source_url ? (
        <a href={item.source_url} target="_blank" rel="noreferrer" className="underline hover:text-white/60">
          {item.source_name}
        </a>
      ) : (
        item.source_name
      )}
      {item.last_verified_date && ` · verified ${item.last_verified_date}`}
    </p>
  );
}
