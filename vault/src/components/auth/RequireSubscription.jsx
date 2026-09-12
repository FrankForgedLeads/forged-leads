import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import Button from "../ui/Button.jsx";

const ACTIVE_STATUSES = ["trialing", "active"];
const POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = 1500;

/**
 * Gates the paid app behind subscription_status in (trialing, active).
 * Otherwise redirects to /subscribe.
 *
 * The one wrinkle: right after Stripe Checkout redirects back to
 * /dashboard?checkout=success, the webhook that actually sets
 * subscription_status on the profile may not have landed yet — webhooks are
 * async and can trail the redirect by a second or two. Bouncing a paying
 * customer straight back to /subscribe in that window would look like they
 * got charged and then denied. So when that query param is present, this
 * polls the profile a few times before giving up, instead of redirecting
 * immediately.
 */
export default function RequireSubscription({ children }) {
  const { profile, loading, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const justCheckedOut = searchParams.get("checkout") === "success";

  const [polling, setPolling] = useState(justCheckedOut);
  const attemptsRef = useRef(0);
  const cancelledRef = useRef(false);

  const isActive = profile && ACTIVE_STATUSES.includes(profile.subscription_status);

  useEffect(() => {
    if (!justCheckedOut || isActive) return undefined;

    cancelledRef.current = false;
    async function poll() {
      attemptsRef.current += 1;
      await refreshProfile();
      if (cancelledRef.current) return;
      if (attemptsRef.current < POLL_ATTEMPTS) {
        setTimeout(poll, POLL_DELAY_MS);
      } else {
        setPolling(false);
      }
    }
    const t = setTimeout(poll, POLL_DELAY_MS);
    return () => {
      cancelledRef.current = true;
      clearTimeout(t);
    };
    // Only re-run if we transition from not-active to active, or on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justCheckedOut, isActive]);

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-600 border-t-gold-500" />
      </div>
    );
  }

  if (isActive) return children;

  if (justCheckedOut && polling) {
    return (
      <div className="container-vault flex min-h-[75vh] flex-col items-center justify-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-600 border-t-gold-500" />
        <p className="text-white/70">Activating your subscription…</p>
      </div>
    );
  }

  if (justCheckedOut && !polling) {
    return (
      <div className="container-vault flex min-h-[75vh] flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-sm text-white/70">
          Your payment went through, but activation is taking longer than usual. This is
          occasionally just a delay in confirmation — try refreshing in a moment.
        </p>
        <Button as="button" type="button" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  return <Navigate to="/subscribe" replace />;
}
