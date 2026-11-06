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
