import { createClient } from "@supabase/supabase-js";
import { requireUser } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

// Cost-control ceiling — see README/SETUP for the reasoning. Deliberately
// generous for real usage, deliberately not "unlimited": the whole point
// of analysis_runs existing is to make this checkable without guessing.
const DAILY_RUN_LIMIT = Number(process.env.ANALYSIS_DAILY_LIMIT) || 20;

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonResponse(500, { error: "Supabase service-role env vars not configured" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(500, { error: "ANTHROPIC_API_KEY is not configured" });
  }

  // requireUser's client is scoped to the caller's own JWT — used only to
  // confirm they actually have access to this claim via the same RLS the
  // rest of the app relies on. Every other read/write below uses the
  // service-role client, since review_files/analysis_runs have no
  // client-writable insert policy by design (see migration.sql).
  const { user, supabase: userClient, error: authError } = await requireUser(req);
  if (authError) return jsonResponse(401, { error: authError });

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }
  const { claimId } = body || {};
  if (!claimId) return jsonResponse(400, { error: "claimId is required" });

  const { data: claim, error: claimError } = await userClient
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  if (claimError) return jsonResponse(500, { error: claimError.message });
  if (!claim) return jsonResponse(404, { error: "Review not found" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // --- Enforce the paywall server-side -----------------------------------
  // RequireSubscription.jsx only gates client-side routing. Without a check
  // here, any signed-in account — subscribed or not — could call this
  // function directly and run paid AI analyses for free, since claims and
  // review_files can be created by any authenticated owner regardless of
  // billing status (see their RLS policies in supabase/migration.sql).
  const { data: billingProfile, error: billingProfileError } = await admin
    .from("profiles")
    .select("subscription_status, stripe_subscription_id, free_review_used_at, card_fingerprint")
    .eq("id", user.id)
    .maybeSingle();
  if (billingProfileError) return jsonResponse(500, { error: billingProfileError.message });

  const BILLABLE_STATUSES = ["trialing", "active"];
  if (!BILLABLE_STATUSES.includes(billingProfile?.subscription_status)) {
    return jsonResponse(402, { error: "Subscribe to run an estimate review." });
  }

  // --- Cost control: per-user daily rate limit ------------------------
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: runsToday, error: countError } = await admin
    .from("analysis_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("started_at", since);
  if (countError) return jsonResponse(500, { error: countError.message });
  if ((runsToday ?? 0) >= DAILY_RUN_LIMIT) {
    return jsonResponse(429, {
      error: `You've reached today's limit of ${DAILY_RUN_LIMIT} reviews. Try again tomorrow.`,
    });
  }

  // --- Confirm an estimate is actually uploaded before starting ----------
  const { data: files, error: filesError } = await admin
    .from("review_files")
    .select("*")
    .eq("claim_id", claimId);
  if (filesError) return jsonResponse(500, { error: filesError.message });

  const estimateFiles = (files || []).filter((f) => f.file_type === "estimate");
  if (estimateFiles.length === 0) {
    return jsonResponse(400, { error: "Upload an estimate before running a review." });
  }

  // --- Create the run row, tracked end-to-end in analysis_runs -----------
  const { data: run, error: runInsertError } = await admin
    .from("analysis_runs")
    .insert({ claim_id: claimId, user_id: user.id, status: "running" })
    .select("*")
    .single();
  if (runInsertError) return jsonResponse(500, { error: runInsertError.message });

  // --- One free review per trialing account, claimed atomically ----------
  // A plain status check isn't enough on its own: two requests fired close
  // together, or one arriving before the trial-end webhook lands, could
  // both see "trialing" and both run a full paid analysis before either
  // one converts the trial. This UPDATE ... WHERE free_review_used_at IS
  // NULL is the actual lock — only one concurrent request can ever win it
  // for a given account. failRun() below releases it again on any failure,
  // so a review that fails never burns the entitlement.
  let reservedFreeReview = false;
  if (billingProfile.subscription_status === "trialing") {
    // Duplicate-free-trial detection: the one-free-review-per-account rule
    // above doesn't stop someone from signing up again with a new email
    // and the same payment card. card_fingerprint identifies the physical
    // card (set by stripe-webhook.js on checkout) without exposing its
    // number. Fails open by design — a missing fingerprint (webhook race,
    // non-card payment method) just skips this check rather than blocking
    // a legitimate customer; see migration.sql's own note on this column.
    if (billingProfile.card_fingerprint) {
      const { data: duplicate, error: duplicateError } = await admin
        .from("profiles")
        .select("id")
        .eq("card_fingerprint", billingProfile.card_fingerprint)
        .neq("id", user.id)
        .not("free_review_used_at", "is", null)
        .limit(1)
        .maybeSingle();
      if (duplicateError) return jsonResponse(500, { error: duplicateError.message });
      if (duplicate) {
        await admin
          .from("analysis_runs")
          .update({
            status: "failed",
            error_message: "Free review already claimed on this payment card",
            completed_at: new Date().toISOString(),
          })
          .eq("id", run.id);
        return jsonResponse(409, {
          error: "You've already used your free review. Subscribe to keep reviewing estimates.",
        });
      }
    }

    const { data: reserved, error: reserveError } = await admin
      .from("profiles")
      .update({ free_review_used_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("free_review_used_at", null)
      .select("id")
      .maybeSingle();
    if (reserveError) return jsonResponse(500, { error: reserveError.message });
    if (!reserved) {
      await admin
        .from("analysis_runs")
        .update({
          status: "failed",
          error_message: "Free review already claimed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
      return jsonResponse(409, {
        error: "You've already used your free review. Subscribe to keep reviewing estimates.",
      });
    }
    reservedFreeReview = true;
  }

  async function failRun(message) {
    await admin
      .from("analysis_runs")
      .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", run.id);
    if (reservedFreeReview) {
      await admin.from("profiles").update({ free_review_used_at: null }).eq("id", user.id);
    }
  }

  // --- Hand off the actual (slow) AI work to a Background Function -------
  // Netlify's regular Functions, and the AWS API Gateway in front of them,
  // hard-kill any request around 29-30s no matter the plan — confirmed
  // live, repeatedly: Claude genuinely takes longer than that (even 25s
  // wasn't enough) to finish a full findings response for this prompt
  // size. There's no synchronous timeout value that's both safe and long
  // enough, so the AI call now runs in review-analyze-background.js, a
  // Background Function (up to 15 minutes, no hard platform cutoff). The
  // frontend polls analysis_runs for completion instead of awaiting one
  // request — see fetchRun() in src/lib/api/analysis.js and
  // FindingsSection in ClaimDetail.jsx.
  //
  // The background function re-verifies this exact run row still exists,
  // belongs to this claim/user, and is still "running" before doing
  // anything — only this request, moments earlier, could have put a row
  // in exactly that state, so a forged POST straight at its URL finds
  // nothing to act on.
  try {
    const origin = req.headers.get("origin") || new URL(req.url).origin;
    await fetch(`${origin}/.netlify/functions/review-analyze-background`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: run.id,
        claimId,
        userId: user.id,
        reservedFreeReview,
        stripeSubscriptionId: billingProfile.stripe_subscription_id,
      }),
    });
  } catch (e) {
    await failRun(e.message);
    return jsonResponse(502, { error: "We couldn't start this review. Your files are safe. Please try again." });
  }

  return jsonResponse(200, { runId: run.id, status: "running" });
};
