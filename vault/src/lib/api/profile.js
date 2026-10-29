import { supabase } from "../supabaseClient.js";

export async function updateProfile(userId, fields) {
  const { data, error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
