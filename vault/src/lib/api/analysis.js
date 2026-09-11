import { supabase } from "../supabaseClient.js";
import { callFunction } from "./functionClient.js";

/** Kicks off an Estimate Review analysis run. Returns { runId, findingsCount }. */
export function runAnalysis(claimId) {
  return callFunction("/.netlify/functions/analyze-review", { claimId });
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
