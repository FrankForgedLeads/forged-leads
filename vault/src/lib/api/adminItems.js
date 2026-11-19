import { supabase } from "../supabaseClient.js";

// Unlike fetchActiveItems() (Vault, is_active=true only), admins manage
// both active and inactive/draft items, so this returns everything.
export async function fetchAllItemsForAdmin() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;
  return data;
}

export async function fetchItem(id) {
  const { data, error } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createItem(fields) {
  const { data, error } = await supabase.from("items").insert(fields).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateItem(id, fields) {
  const { data, error } = await supabase
    .from("items")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Hard delete. items.claim_items has ON DELETE RESTRICT, so this throws a
 * clear, catchable error if the item is attached to any claim — the caller
 * should suggest deactivating instead in that case, not just show "failed".
 */
export async function deleteItem(id) {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Can't delete — this item is attached to one or more claims. Deactivate it instead.",
      );
    }
    throw error;
  }
}
