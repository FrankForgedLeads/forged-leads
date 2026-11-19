import { supabase } from "../supabaseClient.js";

// analysis_runs.user_id references auth.users, not public.profiles directly
// — no FK exists between analysis_runs and profiles for PostgREST to
// auto-embed, so fetch both and merge client-side. claims *does* have a
// direct FK from analysis_runs.claim_id, so that one embeds normally.
export async function fetchAnalysisRuns(limit = 200) {
  const [runsResult, profilesResult] = await Promise.all([
    supabase
      .from("analysis_runs")
      .select("*, claims(project_type, insured_name, property_address, claim_number)")
      .order("started_at", { ascending: false })
      .limit(limit),
    supabase.from("profiles").select("id, email"),
  ]);

  if (runsResult.error) throw runsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const emailById = new Map(profilesResult.data.map((p) => [p.id, p.email]));
  return runsResult.data.map((run) => ({ ...run, user_email: emailById.get(run.user_id) || null }));
}

// The "accuracy" number this product can honestly claim: of every finding
// a real contractor has actually decided on (added or dismissed — "new"
// and "needs_info" aren't decisions yet), what share did they confirm was
// worth adding to their letter? This is a live, continuously-growing
// number sourced entirely from real usage — never a one-off synthetic
// benchmark — which is the whole point: see the "prove accuracy first"
// research this was built from.
export async function fetchFindingsStatusCounts() {
  const { data, error } = await supabase.from("review_findings").select("status");
  if (error) throw error;

  const counts = { new: 0, added: 0, dismissed: 0, needs_info: 0 };
  for (const row of data) {
    if (row.status in counts) counts[row.status]++;
  }
  return counts;
}
