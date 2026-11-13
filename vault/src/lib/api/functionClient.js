import { supabase } from "../supabaseClient.js";

/**
 * POSTs to a Netlify Function with the current user's Supabase access
 * token attached, for functions that verify the caller server-side (see
 * netlify/functions/_lib/auth.js). Shared by billing.js and
 * monthlyUpdate.js.
 */
export async function callFunction(path, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You need to be signed in.");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
