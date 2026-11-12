// Tests for review-analyze-background.js — the actual AI call (moved here
// from review-analyze.js because Claude can genuinely take longer than
// any safe synchronous-function timeout to respond; see that file's top
// comment and review-analyze.js's for the full story). Covers: the run
// must already exist in exactly the right state to be acted on, a
// successful run persists findings and ends the trial, and a failure
// releases the free-review claim rather than burning it.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeDb, makeFakeClient, TEST_USER_ID, TEST_CLAIM_ID, TEST_SUBSCRIPTION_ID } from "./_testUtils.js";

let db;
const stripeUpdateMock = vi.fn(async () => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => makeFakeClient(db),
}));

vi.mock("stripe", () => ({
  default: class FakeStripe {
    subscriptions = { update: stripeUpdateMock };
  },
}));

vi.mock("../_lib/estimateAnalysisService.js", () => ({
  analyzeEstimate: vi.fn(async () => ({
    findings: [
      {
        item_id: "i1",
        title: "Missing flashing",
        scope_status: "not_found_in_estimate",
        reason: "x",
        supplement_narrative: "Our scope of work includes drip edge flashing, required per FBC R905.2.8.5.",
        confidence: "low",
        requires_human_verification: true,
      },
    ],
    model: "claude-haiku-4-5",
    usage: { input_tokens: 10, output_tokens: 10 },
  })),
  estimateCostUsd: () => 0.01,
}));

vi.mock("../_lib/pdfText.js", () => ({
  extractPdfText: vi.fn(async () => "a".repeat(100)),
  MIN_MEANINGFUL_TEXT_LENGTH: 50,
}));

function makeRequest(body) {
  return new Request("https://example.com/.netlify/functions/review-analyze-background", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Simulates exactly the "running" row review-analyze.js would have
// created right before calling this function.
function seedRunningRun(db, overrides = {}) {
  const run = {
    id: "run_1",
    claim_id: TEST_CLAIM_ID,
    user_id: TEST_USER_ID,
    status: "running",
    ...overrides,
  };
  db.analysis_runs.set(run.id, run);
  return run;
}

beforeEach(async () => {
  db = makeDb();
  stripeUpdateMock.mockClear();
  const { analyzeEstimate } = await import("../_lib/estimateAnalysisService.js");
  analyzeEstimate.mockClear();
  process.env.SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = "fake-service-key";
  process.env.ANTHROPIC_API_KEY = "fake-anthropic-key";
  process.env.STRIPE_SECRET_KEY = "fake-stripe-key";
});

describe("review-analyze-background", () => {
  it("completes a run, persists findings, and ends the trial when reservedFreeReview is true", async () => {
    const run = seedRunningRun(db);
    const { default: handler } = await import("../review-analyze-background.js");
    const res = await handler(
      makeRequest({
        runId: run.id,
        claimId: TEST_CLAIM_ID,
        userId: TEST_USER_ID,
        reservedFreeReview: true,
        stripeSubscriptionId: TEST_SUBSCRIPTION_ID,
      }),
    );
    expect(res.status).toBe(200);
    expect(db.analysis_runs.get(run.id).status).toBe("succeeded");
    expect(db.review_findings).toHaveLength(1);
    // The drafted, carrier-facing letter language (see
    // estimateAnalysisService.js and ClaimDetail.jsx's handleAction,
    // which uses this field when a finding is added to a claim) must
    // actually reach the stored finding, not get dropped along the way.
    expect(db.review_findings[0].supplement_narrative).toBe(
      "Our scope of work includes drip edge flashing, required per FBC R905.2.8.5.",
    );
    expect(stripeUpdateMock).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID, { trial_end: "now" });
  });

  it("does not end the trial when reservedFreeReview is false (a paying customer's run)", async () => {
    const run = seedRunningRun(db);
    const { default: handler } = await import("../review-analyze-background.js");
    const res = await handler(
      makeRequest({ runId: run.id, claimId: TEST_CLAIM_ID, userId: TEST_USER_ID, reservedFreeReview: false }),
    );
    expect(res.status).toBe(200);
    expect(stripeUpdateMock).not.toHaveBeenCalled();
  });

  it("releases the free-review claim (doesn't burn it) when the AI call fails", async () => {
    const { analyzeEstimate } = await import("../_lib/estimateAnalysisService.js");
    analyzeEstimate.mockRejectedValueOnce(new Error("model exploded"));

    db.profiles.get(TEST_USER_ID).free_review_used_at = new Date().toISOString();
    const run = seedRunningRun(db);
    const { default: handler } = await import("../review-analyze-background.js");
    const res = await handler(
      makeRequest({ runId: run.id, claimId: TEST_CLAIM_ID, userId: TEST_USER_ID, reservedFreeReview: true }),
    );
    expect(res.status).toBe(502);
    expect(db.analysis_runs.get(run.id).status).toBe("failed");
    expect(db.profiles.get(TEST_USER_ID).free_review_used_at).toBeNull();
  });

  it("only sends vault items matching the claim's state (or state-agnostic items) to the AI", async () => {
    db.items.push(
      { id: "i2", title: "FL item", category: "roofing", is_active: true, state: "FL" },
      { id: "i3", title: "SC item", category: "roofing", is_active: true, state: "SC" },
      { id: "i4", title: "Universal item", category: "water_mitigation", is_active: true, state: null },
    );
    const run = seedRunningRun(db);
    db.claims.get(TEST_CLAIM_ID).state = "FL";
    const { analyzeEstimate } = await import("../_lib/estimateAnalysisService.js");
    const { default: handler } = await import("../review-analyze-background.js");
    await handler(makeRequest({ runId: run.id, claimId: TEST_CLAIM_ID, userId: TEST_USER_ID }));

    const sentItemIds = analyzeEstimate.mock.calls[0][0].vaultItems.map((i) => i.id);
    expect(sentItemIds).toEqual(expect.arrayContaining(["i2", "i4"]));
    expect(sentItemIds).not.toContain("i3");
  });

  it("does nothing if no matching running run exists (forged or already-completed ids)", async () => {
    const { analyzeEstimate } = await import("../_lib/estimateAnalysisService.js");
    const { default: handler } = await import("../review-analyze-background.js");
    const res = await handler(
      makeRequest({ runId: "no_such_run", claimId: TEST_CLAIM_ID, userId: TEST_USER_ID }),
    );
    expect(res.status).toBe(404);
    expect(analyzeEstimate).not.toHaveBeenCalled();
  });

  it("does nothing if the run exists but already finished (not 'running' anymore)", async () => {
    const run = seedRunningRun(db, { status: "succeeded" });
    const { analyzeEstimate } = await import("../_lib/estimateAnalysisService.js");
    const { default: handler } = await import("../review-analyze-background.js");
    const res = await handler(
      makeRequest({ runId: run.id, claimId: TEST_CLAIM_ID, userId: TEST_USER_ID }),
    );
    expect(res.status).toBe(404);
    expect(analyzeEstimate).not.toHaveBeenCalled();
  });
});
