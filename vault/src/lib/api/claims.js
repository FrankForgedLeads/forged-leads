import { supabase } from "../supabaseClient.js";

export async function fetchClaims() {
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchClaim(id) {
  const { data, error } = await supabase.from("claims").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createClaim(fields, userId) {
  const { data, error } = await supabase
    .from("claims")
    .insert({ ...fields, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateClaim(id, fields) {
  const { data, error } = await supabase
    .from("claims")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClaim(id) {
  const { error } = await supabase.from("claims").delete().eq("id", id);
  if (error) throw error;
}
