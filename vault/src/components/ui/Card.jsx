export default function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-navy-600/60 bg-navy-800/60 p-6 shadow-xl shadow-black/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
