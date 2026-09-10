import { supabase } from "../supabaseClient.js";
import { callFunction } from "./functionClient.js";

/** Returns { team, members, pendingInvites } or { team: null } if the
 * caller doesn't own a team yet. */
export async function fetchMyTeam(userId) {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();
  if (teamError) throw teamError;
  if (!team) return { team: null, members: [], pendingInvites: [] };

  const [{ data: members, error: membersError }, { data: pendingInvites, error: invitesError }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("team_id", team.id).order("created_at"),
      supabase
        .from("team_invites")
        .select("*")
        .eq("team_id", team.id)
        .is("accepted_at", null)
        .order("created_at"),
    ]);
  if (membersError) throw membersError;
  if (invitesError) throw invitesError;

  return { team, members, pendingInvites };
}

export function inviteTeammate(email) {
  return callFunction("/.netlify/functions/invite-teammate", { email });
}

export async function revokeInvite(id) {
  const { error } = await supabase.from("team_invites").delete().eq("id", id);
  if (error) throw error;
}
