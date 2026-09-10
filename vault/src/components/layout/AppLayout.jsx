import { Outlet, Link, NavLink } from "react-router-dom";
import Logo from "../ui/Logo.jsx";
import Button from "../ui/Button.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";

const APP_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/vault", label: "Vault" },
  { to: "/claims", label: "Claims" },
];

export default function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const isSubscribed = profile && ["trialing", "active"].includes(profile.subscription_status);
  // Dashboard/Vault/Claims are paywalled — no point showing them in the nav
  // (and inviting a redirect-to-/subscribe click) before there's an active
  // subscription to reach them with.
  const links = isSubscribed
    ? [...APP_LINKS, { to: "/account", label: "Account" }]
    : [{ to: "/account", label: "Account" }];

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <header className="sticky top-0 z-40 border-b border-navy-700/60 bg-navy-950/90 backdrop-blur">
        <div className="container-vault flex h-16 items-center justify-between">
          <Link to={isSubscribed ? "/dashboard" : "/account"}>
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/60 sm:inline">
              {profile?.full_name || user?.email}
            </span>
            {!isSubscribed && (
              <Button to="/subscribe" className="px-4 py-2.5 text-sm">
                Start free trial
              </Button>
            )}
            <Button variant="ghost" onClick={signOut} className="px-4 py-2.5 text-sm">
              Log out
            </Button>
          </div>
        </div>
        <nav className="container-vault flex gap-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition ${
                  isActive ? "bg-gold-500 text-navy-950" : "text-white/70 hover:bg-navy-800 hover:text-white"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
