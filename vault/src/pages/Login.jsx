import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Logo from "../components/ui/Logo.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState("");
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, session, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="container-vault flex min-h-[75vh] items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-extrabold text-white">Log in to Beeyond Vault</h1>
          <p className="mt-2 text-sm text-white/60">
            No password needed. We'll email you a one-time link to sign in.
          </p>
        </div>

        {status === "sent" ? (
          <div className="mt-8 rounded-xl border border-gold-500/30 bg-gold-500/10 p-4 text-center">
            <p className="text-sm font-semibold text-white">Check your email</p>
            <p className="mt-1 text-sm text-white/70">
              We sent a login link to <span className="text-white">{email}</span>. Click it to
              finish signing in — you can close this tab.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-4 text-sm font-semibold text-gold-500 underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-white/80">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                className="w-full rounded-xl border border-navy-500 bg-navy-900 px-4 py-4 text-base text-white placeholder:text-white/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>

            {status === "error" && (
              <p className="text-sm font-semibold text-red-400">{errorMessage}</p>
            )}

            <Button as="button" type="submit" disabled={status === "sending"} className="w-full">
              {status === "sending" ? "Sending link…" : "Send login link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-white/40">
          New here? Just enter your email above — an account is created automatically. Pick a
          plan on the <a href="/pricing" className="underline hover:text-white">pricing page</a>{" "}
          when you're ready to start your trial.
        </p>
      </Card>
    </div>
  );
}
