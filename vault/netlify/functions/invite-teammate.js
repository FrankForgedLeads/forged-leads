import { requireUser } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

const FROM_ADDRESS = "Beeyond Vault <invites@beeyondestimators.com>";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return jsonResponse(500, { error: "RESEND_API_KEY is not configured" });

  const { user, supabase, error: authError } = await requireUser(req);
  if (authError) return jsonResponse(401, { error: authError });

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }
  const email = (body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return jsonResponse(400, { error: "A valid email is required" });
  }

  // All of the reads/writes below run under the caller's own JWT — RLS
  // (teams owner-select, team_invites owner-insert, profiles teammate-
  // select) already grants a Crew owner exactly the access this needs, so
  // there's no reason to escalate to the service-role key here.
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, seat_limit")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (teamError) return jsonResponse(500, { error: teamError.message });
  if (!team) {
    return jsonResponse(400, { error: "You don't have a Crew team yet — subscribe to Crew first." });
  }

  const [{ data: members, error: membersError }, { data: pendingInvites, error: invitesError }] =
    await Promise.all([
      supabase.from("profiles").select("id, email").eq("team_id", team.id),
      supabase.from("team_invites").select("id, email").eq("team_id", team.id).is("accepted_at", null),
    ]);

  if (membersError) return jsonResponse(500, { error: membersError.message });
  if (invitesError) return jsonResponse(500, { error: invitesError.message });

  if (members.some((m) => m.email?.toLowerCase() === email)) {
    return jsonResponse(400, { error: `${email} is already on the team.` });
  }
  if (pendingInvites.some((i) => i.email?.toLowerCase() === email)) {
    return jsonResponse(400, { error: `${email} already has a pending invite.` });
  }
  if (members.length + pendingInvites.length >= team.seat_limit) {
    return jsonResponse(400, {
      error: `Team is full (${members.length}/${team.seat_limit} seats, plus ${pendingInvites.length} pending).`,
    });
  }

  const { error: insertError } = await supabase
    .from("team_invites")
    .insert({ team_id: team.id, email });
  if (insertError) return jsonResponse(500, { error: insertError.message });

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const html = `
    <p>You've been invited to join <strong>${escapeHtml(team.name)}</strong> on Beeyond Vault.</p>
    <p>Sign in at <a href="${origin}/login">${origin}/login</a> with this email address
    (${escapeHtml(email)}) to get access — no password needed, just a one-time login link.</p>
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [email],
        subject: `You're invited to ${team.name} on Beeyond Vault`,
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // The invite row is already saved — they can still be told to sign in
      // manually — so this is a warning, not a failure of the whole request.
      return jsonResponse(200, { ok: true, warning: `Invite saved, but the email failed to send: ${detail}` });
    }
  } catch (e) {
    return jsonResponse(200, { ok: true, warning: `Invite saved, but the email failed to send: ${e.message}` });
  }

  return jsonResponse(200, { ok: true });
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
