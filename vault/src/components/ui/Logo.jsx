export default function Logo({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-navy-950"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2c1.8 0 3.3 1.3 3.7 3.1a4 4 0 0 1 2.2 6.6 4 4 0 0 1-2.2 6.6A3.9 3.9 0 0 1 12 22a3.9 3.9 0 0 1-3.7-3.7 4 4 0 0 1-2.2-6.6 4 4 0 0 1 2.2-6.6C8.7 3.3 10.2 2 12 2Zm-3 8.2v1.6h6v-1.6H9Zm0 3.2v1.6h6v-1.6H9Z" />
        </svg>
      </span>
      <span className="text-white">
        Beeyond <span className="text-gold-500">Vault</span>
      </span>
    </span>
  );
}
