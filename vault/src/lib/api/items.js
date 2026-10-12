import { supabase } from "../supabaseClient.js";

// Vault is a few hundred rows at most — fetch the active set once and filter
// client-side so search-as-you-type is instant with no round trips.
export async function fetchActiveItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;
  return data;
}
