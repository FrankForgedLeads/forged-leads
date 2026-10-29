import { supabase } from "../supabaseClient.js";

// Deliberately no .select() after the insert: feedback_select_admin (see
// migration.sql) only lets admin read feedback rows back, and a
// .select()'d insert requests PostgREST's "return=representation", which
// under RLS re-checks the new row against the table's SELECT policies —
// requesting the representation here would make every real (non-admin)
// customer's feedback submission fail with "new row violates row-level
// security policy", even though the insert itself is perfectly legitimate.
// The caller doesn't need the row back (see FeedbackWidget), so it's never
// requested.
export async function submitFeedback({ userId, message, pageContext }) {
  const { error } = await supabase
    .from("feedback")
    .insert({ user_id: userId, message, page_context: pageContext });
  if (error) throw error;
}

// Admin-only reads/writes below — enforced server-side by feedback_select_admin
// / feedback_update_admin (RLS) and the column-level grant restricting update
// to `status`; a non-admin calling these just gets an empty result / error,
// same as every other admin API module in this app.
export async function fetchFeedback() {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function markFeedbackReviewed(id) {
  const { data, error } = await supabase
    .from("feedback")
    .update({ status: "reviewed" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
