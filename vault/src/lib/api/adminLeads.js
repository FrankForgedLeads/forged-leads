import { supabase } from "../supabaseClient.js";

export async function fetchLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function markLeadContacted(id, contacted) {
  const { data, error } = await supabase
    .from("leads")
    .update({ contacted_at: contacted ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
