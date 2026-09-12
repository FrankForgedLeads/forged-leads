import { supabase } from "../supabaseClient.js";

// Embeds the related item row via the claim_items.item_id -> items.id
// foreign key so the UI has code/citation/range without a second query.
export async function fetchClaimItems(claimId) {
  const { data, error } = await supabase
    .from("claim_items")
    .select("*, items(*)")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function addClaimItem({ claimId, itemId, quantity = 1, customAmount = null, note = "" }) {
  const { data, error } = await supabase
    .from("claim_items")
    .insert({
      claim_id: claimId,
      item_id: itemId,
      quantity,
      custom_amount: customAmount,
      note,
    })
    .select("*, items(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function updateClaimItem(id, fields) {
  const { data, error } = await supabase
    .from("claim_items")
    .update(fields)
    .eq("id", id)
    .select("*, items(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClaimItem(id) {
  const { error } = await supabase.from("claim_items").delete().eq("id", id);
  if (error) throw error;
}
