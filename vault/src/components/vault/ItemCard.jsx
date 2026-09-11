import Card from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import { categoryLabel } from "../../lib/categories.js";
import { formatRange, formatDate } from "../../lib/format.js";

export default function ItemCard({ item, onAdd, adding, added }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-navy-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white/60">
          {categoryLabel(item.category)}
        </span>
        <span className="whitespace-nowrap text-right text-sm font-extrabold text-gold-500">
          {formatRange(item.low_amount, item.high_amount, item.unit)}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-extrabold text-white">{item.title}</h3>

      {(item.xactimate_code || item.code_citation) && (
        <p className="mt-1 text-xs font-semibold text-white/50">
          {[item.xactimate_code, item.code_citation].filter(Boolean).join(" · ")}
        </p>
      )}

      {item.description && (
        <p className="mt-3 text-sm leading-relaxed text-white/70">{item.description}</p>
      )}

      {item.why_owed && (
        <p className="mt-3 rounded-lg bg-navy-900/60 p-3 text-sm leading-relaxed text-white/70">
          <span className="font-bold text-gold-500">Why it may warrant review: </span>
          {item.why_owed}
        </p>
      )}

      {item.jurisdiction_notes && (
        <p className="mt-2 text-xs text-white/50">
          <span className="font-semibold text-white/70">Jurisdiction: </span>
          {item.jurisdiction_notes}
        </p>
      )}

      {item.region_note && (
        <p className="mt-2 text-xs italic text-white/40">{item.region_note}</p>
      )}

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-white/30">
        {item.last_verified_date
          ? `Verified ${formatDate(item.last_verified_date)} — confirm before relying on this`
          : "Not yet verified — confirm before relying on this"}
      </p>

      <Button
        as="button"
        type="button"
        onClick={() => onAdd(item)}
        disabled={adding}
        variant={added ? "primary" : "secondary"}
        className="mt-4 w-full"
      >
        {adding ? "Adding…" : added ? "Added ✓ — add again" : "Add to claim"}
      </Button>
    </Card>
  );
}
