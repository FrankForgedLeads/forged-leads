import { Outlet, Link } from "react-router-dom";
import Logo from "../ui/Logo.jsx";
import Button from "../ui/Button.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";

export default function AppLayout() {
  const { profile, user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <header className="sticky top-0 z-50 border-b border-navy-700/60 bg-navy-950/90 backdrop-blur">
        <div className="container-vault flex h-16 items-center justify-between">
          <Link to="/dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/60 sm:inline">
              {profile?.full_name || user?.email}
            </span>
            <Button variant="ghost" onClick={signOut} className="px-4 py-2.5 text-sm">
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
