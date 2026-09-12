// Netlify Function (v2, Web API style — matches this package's "type":
// "module"). Sends an email to LEADS_EMAIL via Resend whenever someone
// submits the /scope-checker form. Called from src/lib/api/leads.js after
// the lead is already saved to Supabase, so a failure here never loses the
// lead — it's only the notification email that's at risk.
//
// Requires RESEND_API_KEY (server-side secret, set in Netlify's env vars —
// never prefixed VITE_) and, optionally, LEADS_EMAIL (defaults below).
//
// Local `vite dev` does NOT run this — it only exists once deployed to
// Netlify, or when running `netlify dev` locally. See SETUP.md.

const DEFAULT_LEADS_EMAIL = "leads@beeyondestimators.com";
const FROM_ADDRESS = "Beeyond Vault Scope Checker <scope-checker@beeyondestimators.com>";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, { error: "RESEND_API_KEY is not configured" });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { name, email, phone, company, checkedLabels, estimatedTotal } = body || {};
  if (!email || typeof email !== "string") {
    return jsonResponse(400, { error: "email is required" });
  }

  const leadsEmail = process.env.LEADS_EMAIL || DEFAULT_LEADS_EMAIL;
  const itemsList = Array.isArray(checkedLabels) && checkedLabels.length
    ? `<ul>${checkedLabels.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`
    : "<p>(none checked)</p>";

  const html = `
    <h2>New Scope Checker lead</h2>
    <p><strong>Name:</strong> ${escapeHtml(name || "—")}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone || "—")}</p>
    <p><strong>Company:</strong> ${escapeHtml(company || "—")}</p>
    <p><strong>Estimated total left on the table:</strong> ${formatUsd(estimatedTotal)}</p>
    <p><strong>Items checked:</strong></p>
    ${itemsList}
  `.trim();

  let resendRes;
  try {
    resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [leadsEmail],
        reply_to: email,
        subject: `New Scope Checker lead: ${name || email}`,
        html,
      }),
    });
  } catch (e) {
    return jsonResponse(502, { error: "Failed to reach Resend", detail: e.message });
  }

  if (!resendRes.ok) {
    const detail = await resendRes.text().catch(() => "");
    return jsonResponse(502, { error: "Resend rejected the email", detail });
  }

  return jsonResponse(200, { ok: true });
};

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function formatUsd(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
