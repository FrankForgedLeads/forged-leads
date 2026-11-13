// Thin shared wrapper around Resend's HTTP API. Three functions already
// built their own copy of this fetch call (notify-lead.js, send-monthly-
// update.js) before this existed; new callers (the payment-failed alert,
// the weekly digest) use this instead of a fourth copy.
export async function sendEmail({ apiKey, from, to, subject, html, replyTo }) {
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
  } catch (e) {
    throw new Error(`Failed to reach Resend: ${e.message}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend rejected the email (${res.status}): ${detail}`);
  }
}
