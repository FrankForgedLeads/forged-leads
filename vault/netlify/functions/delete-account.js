import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

const BUCKET = "review-files";

// Self-serve "delete my account" — cancels any active Stripe subscription,
// best-effort removes the account's uploaded files from Storage, then
// deletes the auth.users row itself. Everything else (profile, claims,
// documents, findings, analysis runs, letters) disappears via the
// `on delete cascade` foreign keys already in supabase/migration.sql —
// deleting the auth user is the one action that cascades all of it.
export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonResponse(500, { error: "Supabase service-role env vars not configured" });
  }

  const { user, error: authError } = await requireUser(req);
  if (authError) return jsonResponse(401, { error: authError });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // A Crew owner's team disappears along with them (teams.owner_id
  // references auth.users(id) on delete cascade) — fine if they're the
  // only member, but silently cutting off teammates' access is not a
  // side effect "delete my account" should ever cause. Block it instead
  // and point them at a human.
  const { data: ownedTeam, error: ownedTeamError } = await admin
    .from("teams")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (ownedTeamError) return jsonResponse(500, { error: ownedTeamError.message });

  if (ownedTeam) {
    const { count: teammateCount, error: teammateError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("team_id", ownedTeam.id)
      .neq("id", user.id);
    if (teammateError) return jsonResponse(500, { error: teammateError.message });
    if ((teammateCount ?? 0) > 0) {
      return jsonResponse(409, {
        error:
          "You own a team with other members. Remove your teammates (or have them leave) before deleting your account, or contact support for help transferring ownership.",
      });
    }
  }

  // Cancel billing immediately — deleting the account shouldn't leave a
  // subscription quietly charging someone who no longer has access.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return jsonResponse(500, { error: profileError.message });

  if (profile?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
    } catch (e) {
      // Already canceled, already gone, or a transient Stripe error —
      // never let a billing-cleanup hiccup block the account deletion
      // itself; worst case this needs a manual cancel in the Stripe
      // dashboard, which is a much smaller problem than an account that
      // can't be deleted.
      // eslint-disable-next-line no-console
      console.error("[delete-account] Failed to cancel Stripe subscription:", e.message);
    }
  }

  // Best-effort cleanup of this user's actual uploaded files. Deleting
  // their claims (via the cascade below) removes the review_files *rows*,
  // but Storage objects live in a separate system the database cascade
  // can't reach — this walks the same userId/claimId/filename layout
  // uploadReviewFile() writes (see src/lib/api/reviewFiles.js) and
  // removes every object under this user's prefix.
  try {
    const { data: claimFolders } = await admin.storage.from(BUCKET).list(user.id);
    for (const folder of claimFolders || []) {
      const { data: files } = await admin.storage.from(BUCKET).list(`${user.id}/${folder.name}`);
      const paths = (files || []).map((f) => `${user.id}/${folder.name}/${f.name}`);
      if (paths.length > 0) await admin.storage.from(BUCKET).remove(paths);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[delete-account] Storage cleanup failed, continuing with account deletion:", e.message);
  }

  // Deleting the auth user cascades to profiles, claims, and everything
  // under a claim (review_files, analysis_runs, review_findings,
  // claim_items, letters) per the `on delete cascade` foreign keys in
  // supabase/migration.sql.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return jsonResponse(500, { error: deleteError.message });

  return jsonResponse(200, { deleted: true });
};
