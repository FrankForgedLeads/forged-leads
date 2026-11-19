import { useState } from "react";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Logo from "../components/ui/Logo.jsx";
import { supabase } from "../lib/supabaseClient.js";

// Landed on from the "forgot password" email link. supabase-js reads the
// recovery token out of the URL hash on load and sets a (recovery-scoped)
// session automatically — by the time this renders, updateUser() is
// already callable, no token handling needed here.
export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords don't match.");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("done");
  }

  return (
    <div className="container-vault flex min-h-[75vh] items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-extrabold text-white">Set a new password</h1>
        </div>

        {status === "done" ? (
          <div className="mt-8 rounded-xl border border-gold-500/30 bg-gold-500/10 p-4 text-center">
            <p className="text-sm font-semibold text-white">Password updated</p>
            <p className="mt-1 text-sm text-white/70">You can log in with your new password now.</p>
            <Button to="/login" className="mt-4 w-full">
              Go to login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-white/80"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-navy-500 bg-navy-900 px-4 py-4 text-base text-white placeholder:text-white/30 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-semibold text-white/80"
              >
                Confirm new password
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

            {status === "error" && (
              <p className="text-sm font-semibold text-red-400">{errorMessage}</p>
            )}

            <Button as="button" type="submit" disabled={status === "submitting"} className="w-full">
              {status === "submitting" ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
