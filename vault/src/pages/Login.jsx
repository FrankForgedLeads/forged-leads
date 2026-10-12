import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Logo from "../components/ui/Logo.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../lib/AuthContext.jsx";

// Three modes on one page rather than three routes — keeps the single
// "back to login" mental model simple for a non-technical audience.
// "forgot" still has to send an email (there's no secure way around that
// for a password reset), but everyday sign-in/sign-up no longer does.
const MODES = { SIGN_IN: "signin", SIGN_UP: "signup", FORGOT: "forgot" };

export default function Login() {
  const [mode, setMode] = useState(MODES.SIGN_IN);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | sent | error
  const [errorMessage, setErrorMessage] = useState("");
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, session, navigate]);

  function switchMode(next) {
    setMode(next);
    setStatus("idle");
    setErrorMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    // onAuthStateChange picks up the new session and the effect above
    // redirects to /dashboard — nothing else to do here.
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords don't match.");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Only used if "Confirm email" ends up enabled on the Supabase
        // project (SETUP.md has you turn it off, but this is a safe
        // fallback instead of a broken link if it's ever left on).
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    // With email confirmation off (the documented setup), signUp already
    // returns a live session and the redirect effect above fires. If
    // confirmation is somehow on, there's no session yet — tell the user
    // to check their email instead of silently doing nothing.
    if (!(await supabase.auth.getSession()).data.session) {
      setStatus("sent");
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  const handleSubmit =
    mode === MODES.SIGN_IN ? handleSignIn : mode === MODES.SIGN_UP ? handleSignUp : handleForgot;

  const heading =
    mode === MODES.SIGN_IN
      ? "Log in to Beeyond Vault"
      : mode === MODES.SIGN_UP
        ? "Create your account"
        : "Reset your password";

  const subheading =
    mode === MODES.SIGN_IN
      ? "Enter your email and password to sign in."
      : mode === MODES.SIGN_UP
        ? "Set a password — no email link needed, you're in right away."
        : "We'll email you a link to set a new password.";

  return (
    <div className="container-vault flex min-h-[75vh] items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-extrabold text-white">{heading}</h1>
          <p className="mt-2 text-sm text-white/60">{subheading}</p>
        </div>

        {status === "sent" ? (
          <div className="mt-8 rounded-xl border border-gold-500/30 bg-gold-500/10 p-4 text-center">
            <p className="text-sm font-semibold text-white">Check your email</p>
            <p className="mt-1 text-sm text-white/70">
              {mode === MODES.FORGOT
                ? "We sent a password reset link to "
                : "We sent a confirmation link to "}
              <span className="text-white">{email}</span>. Click it to continue.
            </p>
            <button
              type="button"
              onClick={() => switchMode(MODES.SIGN_IN)}
              className="mt-4 text-sm font-semibold text-gold-500 underline"
            >
              Back to login
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

            {mode !== MODES.FORGOT && (
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-semibold text-white/80"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === MODES.SIGN_UP ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-navy-500 bg-navy-900 px-4 py-4 text-base text-white placeholder:text-white/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
            )}

            {mode === MODES.SIGN_UP && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-semibold text-white/80"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Type it again"
                  className="w-full rounded-xl border border-navy-500 bg-navy-900 px-4 py-4 text-base text-white placeholder:text-white/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
            )}

            {mode === MODES.SIGN_IN && (
              <button
                type="button"
                onClick={() => switchMode(MODES.FORGOT)}
                className="text-sm font-semibold text-white/50 hover:text-white"
              >
                Forgot password?
              </button>
            )}

            {status === "error" && (
              <p className="text-sm font-semibold text-red-400">{errorMessage}</p>
            )}

            <Button as="button" type="submit" disabled={status === "submitting"} className="w-full">
              {status === "submitting"
                ? "Please wait…"
                : mode === MODES.SIGN_IN
                  ? "Log in"
                  : mode === MODES.SIGN_UP
                    ? "Create account"
                    : "Send reset link"}
            </Button>
          </form>
        )}

        {status !== "sent" && (
          <p className="mt-6 text-center text-xs text-white/40">
            {mode === MODES.SIGN_IN ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => switchMode(MODES.SIGN_UP)}
                  className="font-semibold text-gold-500 underline"
                >
                  Create an account
                </button>
                . Pick a plan on the{" "}
                <a href="/pricing" className="underline hover:text-white">
                  pricing page
                </a>{" "}
                when you're ready to start your trial.
              </>
            ) : mode === MODES.SIGN_UP ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode(MODES.SIGN_IN)}
                  className="font-semibold text-gold-500 underline"
                >
                  Log in
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => switchMode(MODES.SIGN_IN)}
                className="font-semibold text-gold-500 underline"
              >
                Back to login
              </button>
            )}
          </p>
        )}
      </Card>
    </div>
  );
}
