export default function ScreenshotPlaceholder({ label, className = "" }) {
  return (
    <div
      className={`flex aspect-[16/10] w-full items-center justify-center rounded-2xl border-2 border-dashed border-navy-500/60 bg-navy-800/50 ${className}`}
    >
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-700 text-gold-500">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m3 15 5-5 4 4 3-3 6 6" />
          </svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
          Screenshot: {label}
        </p>
      </div>
    </div>
  );
}
