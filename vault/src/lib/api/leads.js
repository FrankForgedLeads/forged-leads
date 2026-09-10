import { supabase } from "../supabaseClient.js";

/**
 * Saves a Scope Checker lead to Supabase (source of truth — insertable by
 * anyone per the leads_insert_anyone RLS policy) and best-effort notifies
 * leads@beeyondestimators.com via the notify-lead Netlify Function. The
 * notification is fire-and-forget: if it fails (e.g. running `vite dev`
 * without `netlify dev`, or RESEND_API_KEY not set yet), the lead is still
 * captured in the database and the UI still shows the trial CTA.
 */
export async function submitScopeCheckerLead({ name, email, phone, company, checkedItems, total }) {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: name || null,
      email,
      phone: phone || null,
      company: company || null,
      answers: { checked: checkedItems.map((i) => i.id) },
      estimated_total: total,
      source: "scope_checker",
    })
    .select("*")
    .single();

  if (error) throw error;

  notifyLead({ name, email, phone, company, checkedItems, total }).catch((e) => {
    // eslint-disable-next-line no-console
    console.warn("[Beeyond Vault] Lead saved, but the email notification failed:", e.message);
  });

  return data;
}

async function notifyLead({ name, email, phone, company, checkedItems, total }) {
  const res = await fetch("/.netlify/functions/notify-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      phone,
      company,
      checkedLabels: checkedItems.map((i) => i.label),
      estimatedTotal: total,
    }),
  });
  if (!res.ok) throw new Error(`notify-lead returned ${res.status}`);
}
