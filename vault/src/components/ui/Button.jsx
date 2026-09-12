import { Link } from "react-router-dom";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold leading-none transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none";

const variants = {
  primary: "bg-gold-500 text-navy-950 hover:bg-gold-400 shadow-lg shadow-gold-500/10",
  secondary: "bg-navy-700 text-white hover:bg-navy-600 border border-navy-500/50",
  ghost: "bg-transparent text-white hover:bg-navy-800 border border-navy-600",
};

export default function Button({
  as,
  to,
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const classes = `${base} ${variants[variant] ?? variants.primary} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  const Comp = as || "button";
  return (
    <Comp className={classes} {...props}>
      {children}
    </Comp>
  );
}
