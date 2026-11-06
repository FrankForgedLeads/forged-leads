import { useState } from "react";

export default function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="divide-y divide-navy-700/60 rounded-2xl border border-navy-700/60 bg-navy-800/40">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-base font-bold text-white">{item.q}</span>
              <svg
                viewBox="0 0 20 20"
                className={`h-5 w-5 shrink-0 text-gold-500 transition-transform ${
                  isOpen ? "rotate-45" : ""
                }`}
                fill="currentColor"
              >
                <path d="M9 4h2v5h5v2h-5v5H9v-5H4V9h5V4Z" />
              </svg>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-sm leading-relaxed text-white/70">{item.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
