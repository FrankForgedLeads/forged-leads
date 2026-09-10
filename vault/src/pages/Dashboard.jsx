import Card from "../components/ui/Card.jsx";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Dashboard() {
  const { user, profile } = useAuth();

  return (
    <div className="container-vault py-12">
      <h1 className="text-3xl font-extrabold text-white">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}.
      </h1>
      <p className="mt-2 text-white/60">You're signed in as {user?.email}.</p>

      <Card className="mt-8 max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-wide text-gold-500">Phase 2 checkpoint</p>
        <h2 className="mt-2 text-xl font-extrabold text-white">Auth is live.</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Magic-link login, session handling, and your profile row (auto-created in Postgres on
          signup) are working end to end. The real dashboard — recent claims, quick search, new
          claim button, trial countdown banner — lands in Phase 3 along with the Vault and Claims
          pages.
        </p>
      </Card>
    </div>
  );
}
