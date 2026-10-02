import { createClient } from "@supabase/supabase-js";

/**
 * Verifies the bearer token from an Authorization header against Supabase
 * Auth and returns the authenticated user. Never trust a user id sent in a
 * request body instead — that can be spoofed by anyone calling the
 * function directly; this actually validates the JWT with Supabase.
 *
 * Returns a Supabase client scoped to that user's JWT too, so callers can
 * run RLS-respecting queries (e.g. reading the caller's own profile)
 * without needing the service-role key.
 */
export async function requireUser(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { error: "Missing Authorization header" };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: "Invalid or expired session" };
  }

  return { user, supabase };
}
