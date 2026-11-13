import beeyondLogo from "../../assets/beeyond-logo.webp";

export default function Logo({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-extrabold tracking-tight ${className}`}>
      {/* 48px matches the nav logo size used on beeyondestimators.com/beeyondpro.com */}
      <img src={beeyondLogo} alt="Beeyond" className="h-12 w-12 shrink-0 object-contain" />
      <span className="text-white">
        Beeyond <span className="text-gold-500">Vault</span>
      </span>
    </span>
  );
}
