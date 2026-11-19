import { supabase } from "../supabaseClient.js";
import { callFunction } from "./functionClient.js";

export async function fetchVoiceNotes(claimId) {
  const { data, error } = await supabase
    .from("claim_voice_notes")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// The actual Claude call happens server-side (voice-note.js) — the browser
// only ever sends the raw transcript, never talks to Anthropic directly.
export function createVoiceNote({ claimId, transcript }) {
  return callFunction("/.netlify/functions/voice-note", { claimId, transcript });
}

// Only (title, note) are grantable columns for `authenticated` — see the
// column grant in migration.sql. Lets a contractor fix up the AI's cleaned
// write-up without re-dictating the whole thing.
export async function updateVoiceNote(id, fields) {
  const { data, error } = await supabase
    .from("claim_voice_notes")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVoiceNote(id) {
  const { error } = await supabase.from("claim_voice_notes").delete().eq("id", id);
  if (error) throw error;
}
