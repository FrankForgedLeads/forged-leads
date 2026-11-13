import { supabase } from "../supabaseClient.js";
import { callFunction } from "./functionClient.js";

/**
 * Kicks off an Estimate Review analysis run. Returns { runId, status:
 * "running" } immediately — the actual AI call happens afterward in a
 * Netlify Background Function (Claude can genuinely take longer than any
 * safe synchronous-function timeout to finish), so the caller must poll
 * fetchRun(runId) for completion rather than treat this response as the
 * finished result. See pollRun() below.
 */
export function runAnalysis(claimId) {
  // Renamed from "analyze-review" — Netlify kept serving a stale build of
  // that function across several deploys with verified-correct new code,
  // through a from-scratch no-cache rebuild. A fresh function name gives
  // it nothing stale to reuse.
  return callFunction("/.netlify/functions/review-analyze", { claimId });
}

export async function fetchRun(runId) {
  const { data, error } = await supabase.from("analysis_runs").select("*").eq("id", runId).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Polls fetchRun(runId) until it leaves "running", or the time limit
 * elapses. Resolves with the finished run row; throws if the run failed
 * or the poll window ran out (the run may still finish later — the
 * caller can call fetchLatestRun again to check).
 */
export async function pollRun(runId, { intervalMs = 2000, timeoutMs = 4 * 60 * 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const run = await fetchRun(runId);
    if (run?.status === "succeeded") return run;
    if (run?.status === "failed") throw new Error(run.error_message || "The review failed. Please try again.");
    if (Date.now() >= deadline) {
      throw new Error("This review is taking longer than expected. It's still running — check back in a bit.");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export async function fetchFindings(claimId) {
  const { data, error } = await supabase
    .from("review_findings")
    .select("*, items(*)")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchLatestRun(claimId) {
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("claim_id", claimId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateFindingStatus(id, status, extra = {}) {
  const { data, error } = await supabase
    .from("review_findings")
    .update({ status, ...extra })
    .eq("id", id)
    .select("*, items(*)")
    .single();
  if (error) throw error;
  return data;
}
