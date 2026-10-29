import { supabase } from "../supabaseClient.js";

export async function createLetterRecord({ claimId, templateKey, pdfMeta }) {
  const { data, error } = await supabase
    .from("letters")
    .insert({ claim_id: claimId, template_key: templateKey, pdf_meta: pdfMeta })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function fetchLettersForClaim(claimId) {
  const { data, error } = await supabase
    .from("letters")
    .select("*")
    .eq("claim_id", claimId)
    .order("generated_at", { ascending: false });

  if (error) throw error;
  return data;
}
