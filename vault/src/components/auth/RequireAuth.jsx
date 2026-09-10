import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-600 border-t-gold-500" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Note: this only checks that the user is signed in. Subscription-status
  // paywall gating (redirect to /subscribe unless trialing/active) is wired
  // up in Phase 6 once Stripe is in place.
  return children;
}
