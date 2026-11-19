export function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-white/80">
      {children}
    </label>
  );
}

const inputClasses =
  "w-full rounded-xl border border-navy-500 bg-navy-900 px-4 py-3.5 text-base text-white placeholder:text-white/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 disabled:opacity-50";

export function Input(props) {
  return <input {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

export function Select(props) {
  return <select {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

export function Textarea(props) {
  return <textarea {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

export function Field({ label, htmlFor, children }) {
  return (
    <div>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
    </div>
  );
}
