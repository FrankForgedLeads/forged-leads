import { Navigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";

/**
 * Admin routes are intentionally NOT wrapped in RequireSubscription — the
 * person running the Vault (ADMIN_EMAIL) shouldn't need to personally pay
 * for a subscription to manage items, leads, and subscribers. The real
 * security boundary is Postgres RLS (is_admin()), not this component; this
 * just keeps a non-admin from landing on a page that will 404-ish anyway.
 */
export default function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-600 border-t-gold-500" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}
