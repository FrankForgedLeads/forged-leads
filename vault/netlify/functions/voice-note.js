import { createClient } from "@supabase/supabase-js";
import { requireUser } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";
import { cleanVoiceNote } from "./_lib/voiceNoteService.js";

export default async (req) => {
  // Cost-control ceiling, same reasoning as review-analyze.js's
  // ANALYSIS_DAILY_LIMIT — a voice note is a much cheaper call than a full
  // estimate review, so this is deliberately more generous. Read inside
  // the handler, not as a module-level const: this module is imported
  // once and reused across requests/tests, and a module-level const would
  // freeze in whatever VOICE_NOTE_DAILY_LIMIT happened to be set to at
  // that first import.
  const DAILY_NOTE_LIMIT = Number(process.env.VOICE_NOTE_DAILY_LIMIT) || 60;

  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonResponse(500, { error: "Supabase service-role env vars not configured" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse(500, { error: "ANTHROPIC_API_KEY is not configured" });
  }

  // requireUser's client is scoped to the caller's own JWT — used only to
  // confirm they actually have access to this claim via the same RLS the
  // rest of the app relies on. The actual insert below uses the
  // service-role client, since claim_voice_notes has no client-writable
  // insert policy by design (see migration.sql).
  const { user, supabase: userClient, error: authError } = await requireUser(req);
  if (authError) return jsonResponse(401, { error: authError });

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }
  const { claimId, transcript } = body || {};
  if (!claimId) return jsonResponse(400, { error: "claimId is required" });
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return jsonResponse(400, { error: "transcript is required" });
  }

  const { data: claim, error: claimError } = await userClient
    .from("claims")
    .select("id")
    .eq("id", claimId)
    .maybeSingle();
  if (claimError) return jsonResponse(500, { error: claimError.message });
  if (!claim) return jsonResponse(404, { error: "Review not found" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // --- Enforce the paywall server-side -----------------------------------
  // Same reasoning as review-analyze.js: RequireSubscription only gates
  // client-side routing, so this has to be checked again here or any
  // signed-in account could call this function directly for free.
  const { data: billingProfile, error: billingProfileError } = await admin
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  if (billingProfileError) return jsonResponse(500, { error: billingProfileError.message });

  const BILLABLE_STATUSES = ["trialing", "active"];
  if (!BILLABLE_STATUSES.includes(billingProfile?.subscription_status)) {
    return jsonResponse(402, { error: "Subscribe to use voice notes." });
  }

  // --- Cost control: per-user daily rate limit ------------------------
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: notesToday, error: countError } = await admin
    .from("claim_voice_notes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (countError) return jsonResponse(500, { error: countError.message });
  if ((notesToday || 0) >= DAILY_NOTE_LIMIT) {
    return jsonResponse(429, { error: "Daily voice note limit reached. Try again tomorrow." });
  }

  let cleaned;
  try {
    cleaned = await cleanVoiceNote(transcript);
  } catch (e) {
    return jsonResponse(502, { error: `Couldn't process that note: ${e.message}` });
  }

  const { data: row, error: insertError } = await admin
    .from("claim_voice_notes")
    .insert({
      claim_id: claimId,
      user_id: user.id,
      raw_transcript: transcript.trim().slice(0, 12000),
      title: cleaned.title,
      note: cleaned.note,
    })
    .select("*")
    .single();
  if (insertError) return jsonResponse(500, { error: insertError.message });

  return jsonResponse(200, row);
};
