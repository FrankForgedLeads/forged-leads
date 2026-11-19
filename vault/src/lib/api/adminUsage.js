import { supabase } from "../supabaseClient.js";

// Raw rows only — AdminUsage.jsx computes the funnel/conversion stats
// client-side from these, same division of labor as fetchAnalysisRuns()
// in adminAnalysis.js.
export async function fetchUsageData() {
  const [eventsResult, profilesResult, claimsResult] = await Promise.all([
    supabase.from("analytics_events").select("event_name, user_id, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, subscription_status, created_at"),
    supabase.from("claims").select("id, user_id, created_at"),
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (claimsResult.error) throw claimsResult.error;

  return { events: eventsResult.data, profiles: profilesResult.data, claims: claimsResult.data };
}
