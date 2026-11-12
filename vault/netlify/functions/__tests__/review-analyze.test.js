// Tests for review-analyze.js's fast path: auth, paywall, daily rate
// limit, the run row, and the atomic free-review claim. The AI call
// itself moved to review-analyze-background.js (see that file's test for
// the atomic-claim release-on-failure and Stripe trial-end behavior) —
// this function now only sets things up and hands off to it, since
// Claude can genuinely take longer than any safe synchronous-function
// timeout to respond (confirmed live, repeatedly: not a bug, real
// generation time for this prompt size).
//
// This does NOT stand up a real Supabase/Stripe instance — it mocks those
// with a small in-memory store (see _testUtils.js) and exercises the
// actual exported handler.
//
// What this intentionally does NOT cover, and why:
//   - Cross-account RLS isolation: enforced by Postgres policies in
//     supabase/migration.sql, not JS — needs a real Supabase project to
//     test meaningfully. Verified by reading the policies instead.
//   - Duplicate-signup detection via card fingerprint / IP-based
//     blocking: not implemented (see review-analyze-background.test.js's
//     header for the same note).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeDb, makeFakeClient, TEST_USER_ID, TEST_CLAIM_ID } from "./_testUtils.js";

let db;
let fetchMock;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => makeFakeClient(db),
}));

function makeRequest(body) {
  return new Request("https://example.com/.netlify/functions/review-analyze", {
    method: "POST",
    headers: { authorization: "Bearer valid-token", origin: "https://example.com" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  db = makeDb();
  process.env.SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = "fake-service-key";
  process.env.VITE_SUPABASE_ANON_KEY = "fake-anon-key";
  process.env.ANTHROPIC_API_KEY = "fake-anthropic-key";
  fetchMock = vi.fn(async () => new Response("", { status: 202 }));
  global.fetch = fetchMock;
});

describe("review-analyze (fast path: paywall + free-review gate + handoff)", () => {
  it("a trialing customer starts a run, claims their free review, and hands off to the background function", async () => {
    const { default: handler } = await import("../review-analyze.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("running");
    expect(typeof body.runId).toBe("string");

    expect(db.profiles.get(TEST_USER_ID).free_review_used_at).not.toBeNull();
    expect(db.analysis_runs.get(body.runId).status).toBe("running");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.com/.netlify/functions/review-analyze-background");
    const sentBody = JSON.parse(options.body);
    expect(sentBody).toMatchObject({
      runId: body.runId,
      claimId: TEST_CLAIM_ID,
      userId: TEST_USER_ID,
      reservedFreeReview: true,
    });
  });

  it("the same account cannot claim a second free review", async () => {
    const { default: handler } = await import("../review-analyze.js");
    const first = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(first.status).toBe(200);

    fetchMock.mockClear();
    const second = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(second.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a new account sharing a payment card with an account that already used its free review is blocked", async () => {
    const OTHER_USER_ID = "33333333-3333-3333-3333-333333333333";
    const sharedFingerprint = "fp_shared_card";
    db.profiles.set(OTHER_USER_ID, {
      id: OTHER_USER_ID,
      subscription_status: "trialing",
      stripe_subscription_id: null,
      free_review_used_at: new Date().toISOString(), // already used its free review
      card_fingerprint: sharedFingerprint,
    });
    db.profiles.get(TEST_USER_ID).card_fingerprint = sharedFingerprint;

    const { default: handler } = await import("../review-analyze.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(res.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
    // The duplicate-card block fires before the atomic claim even runs —
    // this account's own free_review_used_at must stay untouched.
    expect(db.profiles.get(TEST_USER_ID).free_review_used_at).toBeNull();
  });

  it("a shared card is fine if neither account has used its free review yet", async () => {
    const OTHER_USER_ID = "44444444-4444-4444-4444-444444444444";
    const sharedFingerprint = "fp_shared_card_unused";
    db.profiles.set(OTHER_USER_ID, {
      id: OTHER_USER_ID,
      subscription_status: "trialing",
      stripe_subscription_id: null,
      free_review_used_at: null, // hasn't used its free review
      card_fingerprint: sharedFingerprint,
    });
    db.profiles.get(TEST_USER_ID).card_fingerprint = sharedFingerprint;

    const { default: handler } = await import("../review-analyze.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(res.status).toBe(200);
  });

  it("a paying customer isn't blocked by the free-review gate, and reservedFreeReview is false", async () => {
    db.profiles.get(TEST_USER_ID).subscription_status = "active";
    const { default: handler } = await import("../review-analyze.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(res.status).toBe(200);
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.reservedFreeReview).toBe(false);
  });

  it.each([null, "canceled", "past_due", "unpaid", "incomplete", "incomplete_expired"])(
    "the server rejects starting a review for subscription_status=%s (frontend-only gating can't be trusted)",
    async (status) => {
      db.profiles.get(TEST_USER_ID).subscription_status = status;
      const { default: handler } = await import("../review-analyze.js");
      const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toMatch(/subscribe/i);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("releases the free-review claim if the handoff to the background function itself fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network blip"));
    const { default: handler } = await import("../review-analyze.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(res.status).toBe(502);
    expect(db.profiles.get(TEST_USER_ID).free_review_used_at).toBeNull();

    const retried = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(retried.status).toBe(200);
  });

  it("rejects when no estimate has been uploaded", async () => {
    db.review_files = [];
    const { default: handler } = await import("../review-analyze.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
