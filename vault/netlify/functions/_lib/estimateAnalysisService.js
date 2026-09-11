import Anthropic from "@anthropic-ai/sdk";

// ============================================================================
// estimateAnalysisService — the ONLY module in this codebase that talks to
// an AI provider. Every other part of the app (the analyze-review function,
// the frontend) goes through analyzeEstimate() below and never sees an
// Anthropic-specific type or call. Swapping providers later means changing
// this file, not hunting through the app.
//
// Model choice: defaults to Haiku 4.5 — the cheapest current Claude model
// that still supports text + vision — because this product's whole
// architecture (see README/SETUP) is built around keeping AI cost per
// review low enough not to break the $39 Solo / $99 Crew subscription
// economics. Override with ESTIMATE_ANALYSIS_MODEL if a claim's estimate
// text is complex enough that Haiku's findings prove too shallow in
// practice — that's a real possibility worth watching once this is live,
// not a guess to over-correct for now.
// ============================================================================

const DEFAULT_MODEL = process.env.ESTIMATE_ANALYSIS_MODEL || "claude-haiku-4-5";
const MAX_OUTPUT_TOKENS = 4096;

// Every rule here maps directly to a "never" in the product spec. Keep this
// list in sync with that spec if it changes — this prompt is the actual
// enforcement mechanism, not just documentation of intent.
const SYSTEM_PROMPT = `You are the analysis engine behind Beeyond Vault's Estimate Review feature, used by contractors and estimating professionals to review their own property-damage estimates before submitting them.

Your ONLY job: compare the uploaded estimate's text against a provided knowledge base of commonly-overlooked line items, and flag items that may deserve a second look. You are a documentation and estimating review assistant — never a public adjuster, attorney, engineer, or insurance-coverage advisor.

STRICT RULES — every one of these is a hard requirement, not a style preference:
- Never invent measurements, quantities, or damage that isn't supported by the estimate text or documentation you were given.
- Never invent or guess a Florida Building Code citation, a Xactimate code, or any other reference. Only use exactly what appears in the knowledge base items provided to you.
- Never claim a specific dollar amount is "owed." You may cite the knowledge base item's typical price range as "a potential amount for review," never as a determination.
- Never determine or imply insurance coverage, never represent the policyholder, never negotiate, never make a legal conclusion.
- Only reference a knowledge base item by its exact id from the list provided. If no item from the list matches, use item_id: null rather than inventing one.
- Distinguish carefully between "this item's text doesn't appear in the estimate" (scope_status: "not_found_in_estimate" — an absence, not a determination) and "the documentation strongly indicates this specific item is required by code" (scope_status: "code_required" — reserve this ONLY when a knowledge base item's own code_citation clearly and directly applies to the documented scope; use it rarely). Use "quantity_mismatch" when the estimate includes the item but the quantity/area seems inconsistent with the documented scope.
- If you are uncertain, say so — use confidence: "low" and explain the uncertainty in your reason. Do not round uncertainty up to sound more useful.
- If the estimate or documentation doesn't give you enough to evaluate a knowledge base item at all, simply don't include a finding for it — do not fabricate a finding to fill space.
- Every finding's "reason" must explain, in plain language, what in the estimate or documentation led you to flag it — separate what you actually observed from what you're inferring.
- Never use the words "owed," "entitled," or "you're leaving money on the table" — use "potentially missing," "potentially under-scoped," "may warrant review," or "documentation suggests" instead.
- Each knowledge base item lists a jurisdiction note when one applies (e.g. "HVHZ counties only"). If the project info's property location clearly doesn't match a stated jurisdiction restriction, don't flag that item at all. If the location is ambiguous or unstated, you may still flag it but lower confidence and say in your reason that jurisdiction should be confirmed.

OUTPUT FORMAT: respond with ONLY a single valid JSON object, no markdown fences, no prose before or after. Shape:
{
  "findings": [
    {
      "item_id": "<exact id from the knowledge base list, or null>",
      "title": "<short title>",
      "scope_status": "not_found_in_estimate" | "quantity_mismatch" | "code_required",
      "reason": "<plain-language explanation, 1-3 sentences>",
      "evidence": "<what in the uploaded documentation supports this, or null if none>",
      "confidence": "high" | "medium" | "low",
      "suggested_quantity": <number or null>,
      "suggested_unit": "<string or null>",
      "requires_human_verification": true
    }
  ]
}
If nothing in the knowledge base appears to warrant review, return {"findings": []} — an empty result is a valid, honest answer.`;

function buildUserPrompt({ projectInfo, estimateText, documentFiles, vaultItems }) {
  const projectLines = Object.entries(projectInfo)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const docLines = documentFiles.length
    ? documentFiles
        .map((f) =>
          f.extractedText
            ? `- ${f.file_name} (${f.file_type}), text content:\n${f.extractedText.slice(0, 4000)}`
            : `- ${f.file_name} (${f.file_type}) — uploaded, not text-analyzed (${f.file_type === "photo" ? "photo content is not analyzed in this version" : "no extractable text"})`,
        )
        .join("\n")
    : "None uploaded.";

  const itemLines = vaultItems
    .map(
      (i) =>
        `- id: ${i.id} | title: ${i.title} | category: ${i.category} | xactimate: ${i.xactimate_code || "n/a"} | code_citation: ${i.code_citation || "n/a"} | jurisdiction: ${i.jurisdiction_notes || "no jurisdiction restriction noted"} | typical range: ${i.low_amount ?? "?"}-${i.high_amount ?? "?"} per ${i.unit || "unit"} | why it may warrant review: ${i.why_owed || "n/a"}`,
    )
    .join("\n");

  return `PROJECT INFO:\n${projectLines || "(none provided)"}\n\nUPLOADED ESTIMATE TEXT:\n${estimateText.slice(0, 20000)}\n\nSUPPORTING DOCUMENTATION ON FILE:\n${docLines}\n\nKNOWLEDGE BASE ITEMS TO CHECK AGAINST:\n${itemLines}\n\nReview the estimate text against each knowledge base item and return findings per the required JSON format.`;
}

function coerceFinding(raw, validItemIds) {
  const VALID_SCOPE_STATUS = new Set(["not_found_in_estimate", "quantity_mismatch", "code_required"]);
  const VALID_CONFIDENCE = new Set(["high", "medium", "low"]);

  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.title !== "string" || !raw.title.trim()) return null;
  if (typeof raw.reason !== "string" || !raw.reason.trim()) return null;

  // Defensive validation — never trust the model's output blindly, even
  // though the prompt instructs it. An id outside the list we sent it, or
  // an invalid enum value, gets nulled/coerced rather than passed through.
  const item_id = validItemIds.has(raw.item_id) ? raw.item_id : null;
  const scope_status = VALID_SCOPE_STATUS.has(raw.scope_status) ? raw.scope_status : "not_found_in_estimate";
  const confidence = VALID_CONFIDENCE.has(raw.confidence) ? raw.confidence : "low";

  return {
    item_id,
    title: raw.title.trim().slice(0, 200),
    scope_status,
    reason: raw.reason.trim().slice(0, 2000),
    evidence: typeof raw.evidence === "string" && raw.evidence.trim() ? raw.evidence.trim().slice(0, 1000) : null,
    confidence,
    suggested_quantity: Number.isFinite(raw.suggested_quantity) ? raw.suggested_quantity : null,
    suggested_unit: typeof raw.suggested_unit === "string" ? raw.suggested_unit.slice(0, 50) : null,
    requires_human_verification: true, // never trust the model to turn this off
  };
}

/**
 * The one function the rest of the app calls. Returns structured findings
 * — never free-form text the UI would have to interpret — or throws, which
 * the caller (analyze-review.js) turns into a failed analysis_runs row and
 * a "we couldn't complete this review, your files are safe" response.
 * Never returns partial/fabricated results on a parse failure.
 */
export async function analyzeEstimate({ projectInfo, estimateText, documentFiles, vaultItems }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const validItemIds = new Set(vaultItems.map((i) => i.id));

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt({ projectInfo, estimateText, documentFiles, vaultItems }) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Analysis model returned no text content");

  let parsed;
  try {
    // Models occasionally wrap JSON in a fence despite instructions not to
    // — strip one if present rather than failing on an otherwise-good
    // response.
    const cleaned = textBlock.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Analysis model returned invalid JSON");
  }

  const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : [];
  const findings = rawFindings.map((f) => coerceFinding(f, validItemIds)).filter(Boolean);

  return {
    findings,
    model: DEFAULT_MODEL,
    usage: {
      input_tokens: response.usage?.input_tokens ?? null,
      output_tokens: response.usage?.output_tokens ?? null,
    },
  };
}

// Per-million-token USD pricing for the models this service might run —
// used only to populate analysis_runs.estimated_cost_usd for cost
// monitoring, never shown to the customer as a bill. Rough and
// intentionally simple; update if pricing changes or a new model is added
// to ESTIMATE_ANALYSIS_MODEL.
const PRICING_PER_MTOK = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
  "claude-opus-5": { input: 5.0, output: 25.0 },
};

export function estimateCostUsd(model, usage) {
  const pricing = PRICING_PER_MTOK[model];
  if (!pricing || !usage?.input_tokens || !usage?.output_tokens) return null;
  return (usage.input_tokens / 1e6) * pricing.input + (usage.output_tokens / 1e6) * pricing.output;
}
