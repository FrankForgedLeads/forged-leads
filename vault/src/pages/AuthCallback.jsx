import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../lib/AuthContext.jsx";

export default function AuthCallback() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    // Supabase parses the magic-link tokens from the URL and fires
    // onAuthStateChange asynchronously. If that hasn't produced a session
    // after a few seconds, the link was probably invalid or expired.
    const t = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, []);

  if (timedOut && !session) {
    return (
      <div className="container-vault flex min-h-[75vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-white">That link didn't work</h1>
        <p className="max-w-sm text-white/60">
          It may have expired or already been used. Request a new login link and try again.
        </p>
        <Button to="/login">Back to login</Button>
      </div>
    );
  }

  return (
    <div className="container-vault flex min-h-[75vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-600 border-t-gold-500" />
      <p className="text-white/60">Signing you in…</p>
    </div>
  );
}
