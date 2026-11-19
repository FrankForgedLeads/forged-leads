import { CATEGORIES } from "../../lib/categories.js";

export default function CategoryFilter({ value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
          value === null
            ? "border-gold-500 bg-gold-500 text-navy-950"
            : "border-navy-600 bg-navy-800 text-white/70 hover:text-white"
        }`}
      >
        All
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
            value === c.key
              ? "border-gold-500 bg-gold-500 text-navy-950"
              : "border-navy-600 bg-navy-800 text-white/70 hover:text-white"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
