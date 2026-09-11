import { createClient } from "@supabase/supabase-js";
import { requireUser } from "./_lib/auth.js";
import { jsonResponse } from "./_lib/http.js";
import { extractPdfText, MIN_MEANINGFUL_TEXT_LENGTH } from "./_lib/pdfText.js";
import { analyzeEstimate, estimateCostUsd } from "./_lib/estimateAnalysisService.js";

// Cost-control ceiling — see README/SETUP for the reasoning. Deliberately
// generous for real usage, deliberately not "unlimited": the whole point
// of analysis_runs existing is to make this checkable without guessing.
const DAILY_RUN_LIMIT = Number(process.env.ANALYSIS_DAILY_LIMIT) || 20;
const BUCKET = "review-files";

export default async (req) => {
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
  // rest of the app relies on. Every other read/write in this function
  // uses the service-role client below, since review_findings/analysis_runs
  // have no client-writable insert policy by design (see migration.sql).
  const { user, supabase: userClient, error: authError } = await requireUser(req);
  if (authError) return jsonResponse(401, { error: authError });

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }
  const { claimId } = body || {};
  if (!claimId) return jsonResponse(400, { error: "claimId is required" });

  const { data: claim, error: claimError } = await userClient
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  if (claimError) return jsonResponse(500, { error: claimError.message });
  if (!claim) return jsonResponse(404, { error: "Review not found" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // --- Cost control: per-user daily rate limit ------------------------
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: runsToday, error: countError } = await admin
    .from("analysis_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("started_at", since);
  if (countError) return jsonResponse(500, { error: countError.message });
  if ((runsToday ?? 0) >= DAILY_RUN_LIMIT) {
    return jsonResponse(429, {
      error: `You've reached today's limit of ${DAILY_RUN_LIMIT} reviews. Try again tomorrow.`,
    });
  }

  // --- Gather uploaded files -------------------------------------------
  const { data: files, error: filesError } = await admin
    .from("review_files")
    .select("*")
    .eq("claim_id", claimId);
  if (filesError) return jsonResponse(500, { error: filesError.message });

  const estimateFiles = (files || []).filter((f) => f.file_type === "estimate");
  if (estimateFiles.length === 0) {
    return jsonResponse(400, { error: "Upload an estimate before running a review." });
  }

  async function downloadText(file) {
    if (file.mime_type !== "application/pdf") return null;
    const { data: blob, error: downloadError } = await admin.storage.from(BUCKET).download(file.storage_path);
    if (downloadError) throw new Error(`Couldn't read ${file.file_name}: ${downloadError.message}`);
    const buffer = Buffer.from(await blob.arrayBuffer());
    return extractPdfText(buffer);
  }

  // --- Run the analysis, tracked end-to-end in analysis_runs -----------
  const { data: run, error: runInsertError } = await admin
    .from("analysis_runs")
    .insert({ claim_id: claimId, user_id: user.id, status: "running" })
    .select("*")
    .single();
  if (runInsertError) return jsonResponse(500, { error: runInsertError.message });

  async function failRun(message) {
    await admin
      .from("analysis_runs")
      .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", run.id);
  }

  let estimateText;
  try {
    // Concatenate text from every uploaded estimate file (usually just
    // one, but a revised estimate might be uploaded alongside the original).
    const texts = await Promise.all(estimateFiles.map(downloadText));
    estimateText = texts.filter(Boolean).join("\n\n").trim();
  } catch (e) {
    await failRun(e.message);
    return jsonResponse(502, { error: "We couldn't read your estimate file. Your files are safe. Please try again." });
  }

  if (estimateText.length < MIN_MEANINGFUL_TEXT_LENGTH) {
    await failRun("Estimate PDF extracted no meaningful text (likely a scanned image)");
    return jsonResponse(422, {
      error:
        "We couldn't read text from your estimate — it may be a scanned image rather than a text-based PDF. Try re-exporting it as a text PDF, or continue without an automatic review.",
    });
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

  const { data: vaultItems, error: itemsError } = await admin
    .from("items")
    .select("id, title, category, xactimate_code, code_citation, low_amount, high_amount, unit, why_owed")
    .eq("is_active", true);
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
    return jsonResponse(502, {
      error: "We couldn't complete this review. Your files are safe. Please try again.",
    });
  }

  // --- Persist findings + close out the run -----------------------------
  const findingsToInsert = result.findings.map((f) => ({
    ...f,
    claim_id: claimId,
    analysis_run_id: run.id,
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
    .eq("id", run.id);

  return jsonResponse(200, { runId: run.id, findingsCount: findingsToInsert.length });
};
