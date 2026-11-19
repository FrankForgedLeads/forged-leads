import { supabase } from "../supabaseClient.js";

// Small, browse-only table — fetch the active set once, same pattern as
// fetchActiveItems().
export async function fetchPriceReferences() {
  const { data, error } = await supabase
    .from("price_references")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("description", { ascending: true });

  if (error) throw error;
  return data;
}
