import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { jsonResponse } from "./_lib/http.js";
import { extractPdfText, MIN_MEANINGFUL_TEXT_LENGTH } from "./_lib/pdfText.js";
import { analyzeEstimate, estimateCostUsd } from "./_lib/estimateAnalysisService.js";

const BUCKET = "review-files";

// Netlify Background Function (the "-background" suffix in the filename
// is what tells Netlify to run it this way): up to 15 minutes, and
// whatever this handler returns is never read by the caller — Netlify
// responds 202 to review-analyze.js's fetch() the moment this invocation
// is accepted, not when it finishes. review-analyze.js does all the fast,
// synchronous setup (auth, paywall, rate limit, the run row, the atomic
// free-review claim) and hands off here only for the slow part: reading
// the PDF and calling Claude. The frontend finds out this is done by
// polling the analysis_runs row this function updates, not by waiting on
// an HTTP response (see fetchRun() in src/lib/api/analysis.js).
export default async (req) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonResponse(500, { error: "Supabase service-role env vars not configured" });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }
  const { runId, claimId, userId, reservedFreeReview, stripeSubscriptionId } = body || {};
  if (!runId || !claimId || !userId) {
    return jsonResponse(400, { error: "runId, claimId, and userId are required" });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // The only "auth" this function has, and deliberately so: this exact
  // run row, for this exact claim and user, must already exist with
  // status "running" — only review-analyze.js's authenticated handler
  // could have put it in that state, moments before calling here. A
  // request naming ids that don't line up finds nothing to do.
  const { data: run, error: runLookupError } = await admin
    .from("analysis_runs")
    .select("*")
    .eq("id", runId)
    .eq("claim_id", claimId)
    .eq("user_id", userId)
    .eq("status", "running")
    .maybeSingle();
  if (runLookupError || !run) {
    return jsonResponse(404, { error: "No matching running analysis run" });
  }

  async function failRun(message) {
    await admin
      .from("analysis_runs")
      .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", runId);
    if (reservedFreeReview) {
      await admin.from("profiles").update({ free_review_used_at: null }).eq("id", userId);
    }
  }

  const { data: claim, error: claimError } = await admin.from("claims").select("*").eq("id", claimId).maybeSingle();
  if (claimError || !claim) {
    await failRun(claimError?.message || "Claim not found");
    return jsonResponse(404, { error: "Claim not found" });
  }

  const { data: files, error: filesError } = await admin.from("review_files").select("*").eq("claim_id", claimId);
  if (filesError) {
    await failRun(filesError.message);
    return jsonResponse(500, { error: filesError.message });
  }

  const estimateFiles = (files || []).filter((f) => f.file_type === "estimate");
  if (estimateFiles.length === 0) {
    await failRun("No estimate file found");
    return jsonResponse(400, { error: "No estimate file found" });
  }

  async function downloadText(file) {
    if (file.mime_type !== "application/pdf") return null;
    const { data: blob, error: downloadError } = await admin.storage.from(BUCKET).download(file.storage_path);
    if (downloadError) throw new Error(`Couldn't read ${file.file_name}: ${downloadError.message}`);
    const buffer = Buffer.from(await blob.arrayBuffer());
    return extractPdfText(buffer);
  }

  let estimateText;
  try {
    // Concatenate text from every uploaded estimate file (usually just
    // one, but a revised estimate might be uploaded alongside the original).
    const texts = await Promise.all(estimateFiles.map(downloadText));
    estimateText = texts.filter(Boolean).join("\n\n").trim();
  } catch (e) {
    await failRun(e.message);
    return jsonResponse(502, { error: "We couldn't read your estimate file." });
  }

  if (estimateText.length < MIN_MEANINGFUL_TEXT_LENGTH) {
    await failRun("Estimate PDF extracted no meaningful text (likely a scanned image)");
    return jsonResponse(422, { error: "Estimate PDF extracted no meaningful text" });
  }

  // Non-estimate documents: extract text from any PDFs among them too
  // (free, no AI) so an uploaded invoice or moisture report can inform the
  // review. Photos are listed by name only — never pretend a photo was
  // analyzed when it wasn't (see estimateAnalysisService's own note on
  // this in its prompt).
  const otherFiles = (files || []).filter((f) => f.file_type !== "estimate");
  const documentFiles = await Promise.all(
    otherFiles.map(async (f) => {
      let extractedText = null;
      if (f.file_type === "document" && f.mime_type === "application/pdf") {
        try {
          extractedText = await downloadText(f);
        } catch {
          extractedText = null; // non-fatal — just fall back to filename-only context
        }
      }
      return { file_name: f.file_name, file_type: f.file_type, extractedText };
    }),
  );

  // state IS NULL = applies everywhere (national standards like IICRC
  // S500/S520, or plain labor/material lines with no code_citation at
  // all); otherwise the item only applies in that one state. Falls back
  // to 'FL' for a claim that somehow has no state set (shouldn't happen —
  // every claim gets backfilled to 'FL' on creation, see NewClaim.jsx —
  // but this is what every pre-multi-state claim actually is anyway).
  const claimState = claim.state || "FL";
  const { data: vaultItems, error: itemsError } = await admin
    .from("items")
    .select(
      "id, title, category, xactimate_code, code_citation, low_amount, high_amount, unit, why_owed, jurisdiction_notes",
    )
    .eq("is_active", true)
    .or(`state.is.null,state.eq.${claimState}`);
  if (itemsError) {
    await failRun(itemsError.message);
    return jsonResponse(500, { error: itemsError.message });
  }

  const projectInfo = {
    "Project type": claim.project_type,
    Trade: claim.trade,
    "Property location": claim.property_address,
    "Estimate total": claim.estimate_total,
    "Date of loss": claim.date_of_loss,
    "Loss type": claim.loss_type,
    Description: claim.description,
    Notes: claim.notes,
  };

  let result;
  try {
    result = await analyzeEstimate({ projectInfo, estimateText, documentFiles, vaultItems: vaultItems || [] });
  } catch (e) {
    await failRun(e.message);
    return jsonResponse(502, { error: "We couldn't complete this review." });
  }

  // --- Persist findings + close out the run -----------------------------
  const findingsToInsert = result.findings.map((f) => ({
    ...f,
    claim_id: claimId,
    analysis_run_id: runId,
  }));

  if (findingsToInsert.length > 0) {
    const { error: findingsError } = await admin.from("review_findings").insert(findingsToInsert);
    if (findingsError) {
      await failRun(findingsError.message);
      return jsonResponse(500, { error: findingsError.message });
    }
  }

  await admin
    .from("analysis_runs")
    .update({
      status: "succeeded",
      model: result.model,
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      estimated_cost_usd: estimateCostUsd(result.model, result.usage),
      findings_count: findingsToInsert.length,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  // --- Free trial ends on first use, not on a day count ------------------
  // See create-checkout-session.js: trial_period_days is a long safety-net
  // ceiling, not the real trial length. The actual trial ends right here,
  // the moment someone's first review succeeds — Stripe then bills their
  // card immediately. Best-effort: if this fails, the long trial ceiling
  // still ends it eventually, so a failure here never blocks the response.
  if (reservedFreeReview && stripeSubscriptionId) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.update(stripeSubscriptionId, { trial_end: "now" });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[review-analyze-background] Failed to end trial after first review:", e.message);
    }
  }

  return jsonResponse(200, { runId, findingsCount: findingsToInsert.length });
};
