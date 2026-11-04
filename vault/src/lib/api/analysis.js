import { supabase } from "../supabaseClient.js";
import { callFunction } from "./functionClient.js";

/** Kicks off an Estimate Review analysis run. Returns { runId, findingsCount }. */
export function runAnalysis(claimId) {
  // Renamed from "analyze-review" — Netlify kept serving a stale build of
  // that function across several deploys with verified-correct new code,
  // through a from-scratch no-cache rebuild. A fresh function name gives
  // it nothing stale to reuse.
  return callFunction("/.netlify/functions/review-analyze", { claimId });
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
