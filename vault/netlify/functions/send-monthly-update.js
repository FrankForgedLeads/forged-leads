import { requireUser } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";

const RESEND_BATCH_SIZE = 100; // Resend's /emails/batch cap per call
const FROM_ADDRESS = "Beeyond Vault <updates@beeyondestimators.com>";

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return jsonResponse(500, { error: "RESEND_API_KEY is not configured" });

  const { user, supabase, error: authError } = await requireUser(req);
  if (authError) return jsonResponse(401, { error: authError });

  // Admin status lives in the admins table, checked the same way the app's
  // RLS policies check it — not a second, divergent ADMIN_EMAIL comparison.
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) return jsonResponse(500, { error: adminError.message });
  if (!isAdmin) return jsonResponse(403, { error: "Admin access required" });

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { subject, bodyHtml } = body || {};
  if (!subject || !bodyHtml) {
    return jsonResponse(400, { error: "subject and bodyHtml are required" });
  }

  // The RLS policy on profiles already lets an admin caller select every
  // row (not just their own), so this runs under the admin's own JWT —
  // no need to escalate to the service-role key for a read admins are
  // already allowed to make.
  const { data: subscribers, error: subscribersError } = await supabase
    .from("profiles")
    .select("email")
    .in("subscription_status", ["trialing", "active"]);

  if (subscribersError) return jsonResponse(500, { error: subscribersError.message });

  const emails = [...new Set(subscribers.map((s) => s.email).filter(Boolean))];
  if (emails.length === 0) {
    return jsonResponse(200, { sent: 0, warning: "No trialing/active subscribers to email." });
  }

  const batches = chunk(emails, RESEND_BATCH_SIZE);
  try {
    for (const batch of batches) {
      const payload = batch.map((to) => ({ from: FROM_ADDRESS, to: [to], subject, html: bodyHtml }));
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Resend batch failed (${res.status}): ${detail}`);
      }
    }
  } catch (e) {
    return jsonResponse(502, { error: e.message });
  }

  // eslint-disable-next-line no-console
  console.log(`[send-monthly-update] ${user.email} sent an update to ${emails.length} subscribers`);

  return jsonResponse(200, { sent: emails.length });
};
