import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../ui/Logo.jsx";
import Button from "../ui/Button.jsx";

const links = [
  { to: "/#features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/scope-checker", label: "Free Scope Checker" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-navy-700/60 bg-navy-950/90 backdrop-blur">
      <div className="container-vault flex h-16 items-center justify-between">
        <Link to="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.to}
              href={l.to}
              className="text-sm font-semibold text-white/80 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button to="/login" variant="ghost" className="px-4 py-2.5 text-sm">
            Log in
          </Button>
          <Button to="/pricing" className="px-4 py-2.5 text-sm">
            Start free trial
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-navy-600 text-white md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-navy-700/60 bg-navy-950 md:hidden">
          <div className="container-vault flex flex-col gap-1 py-4">
            {links.map((l) => (
              <a
                key={l.to}
                href={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-semibold text-white/85 hover:bg-navy-800"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-3 px-1">
              <Button to="/login" variant="secondary" onClick={() => setOpen(false)}>
                Log in
              </Button>
              <Button to="/pricing" onClick={() => setOpen(false)}>
                Start free trial
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
