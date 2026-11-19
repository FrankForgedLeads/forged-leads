import { supabase } from "../supabaseClient.js";

// Fire-and-forget: analytics must never block, delay, or break the
// customer-facing action it's attached to. Caller passes userId explicitly
// (always already in scope wherever this is called — see call sites)
// rather than this doing its own supabase.auth.getUser() round trip.
export function logEvent(eventName, userId, metadata = null) {
  if (!userId) return;
  supabase
    .from("analytics_events")
    .insert({ event_name: eventName, user_id: userId, metadata })
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.warn(`[Beeyond Vault] Failed to log analytics event "${eventName}":`, error.message);
      }
    });
}
