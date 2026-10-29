// Tests for the paywall + atomic free-review logic added to
// analyze-review.js during the production audit (see supabase/migration.sql
// "SECURITY FIX (production audit)" and the matching block in that
// function). This does NOT stand up a real Supabase/Stripe/Anthropic
// instance — it mocks those three modules with a small in-memory store and
// exercises the actual exported handler, so what's under test is
// analyze-review.js's own logic (the gate, the atomic claim, the
// release-on-failure), not Postgres, Stripe, or Claude themselves.
//
// What this intentionally does NOT cover, and why:
//   - Cross-account RLS isolation: enforced by Postgres policies in
//     supabase/migration.sql, not JS — needs a real Supabase project to
//     test meaningfully. Verified by reading the policies instead (see the
//     audit report).
//   - Stripe webhook idempotency on retried deliveries: verified by reading
//     stripe-webhook.js (it compares previous vs. new status before logging
//     any event, so a repeated identical webhook is a no-op update). Not
//     re-tested here since it needs a real Stripe test-mode webhook.
//   - Duplicate-signup detection via card fingerprint: not implemented yet
//     (flagged in the audit as a separate migration/webhook change pending
//     approval), so there's nothing to test.
//   - IP-based blocking: deliberately never implemented (Frank's own
//     instruction was not to gate on IP alone) — nothing to test.
import { describe, it, expect, vi, beforeEach } from "vitest";

const TEST_USER_ID = "11111111-1111-1111-1111-111111111111";
const TEST_CLAIM_ID = "22222222-2222-2222-2222-222222222222";
const TEST_SUBSCRIPTION_ID = "sub_test123";

// --- In-memory fake standing in for both the admin (service-role) client
// and the user-scoped client analyze-review.js creates — good enough for
// testing this function's own logic, since RLS itself is Postgres's job
// and is reviewed separately, not re-implemented here.
function makeDb() {
  return {
    profiles: new Map([
      [
        TEST_USER_ID,
        {
          id: TEST_USER_ID,
          subscription_status: "trialing",
          stripe_subscription_id: TEST_SUBSCRIPTION_ID,
          free_review_used_at: null,
        },
      ],
    ]),
    claims: new Map([[TEST_CLAIM_ID, { id: TEST_CLAIM_ID, user_id: TEST_USER_ID }]]),
    review_files: [
      { id: "f1", claim_id: TEST_CLAIM_ID, file_type: "estimate", mime_type: "application/pdf", storage_path: "p1" },
    ],
    items: [{ id: "i1", title: "Test item", category: "roofing", is_active: true }],
    analysis_runs: new Map(),
    review_findings: [],
  };
}

function makeFakeClient(db) {
  function builder(table) {
    const state = { table, filters: [] };
    const api = {
      select: (_cols, opts) => {
        // .insert(x).select() / .update(x).select() (both real Supabase
        // patterns, used here to get the affected row back) must not
        // clobber the op that actually mutated the fake store.
        if (!state.op) state.op = "select";
        state.countOnly = opts?.head === true;
        return api;
      },
      insert: (payload) => {
        state.op = "insert";
        state.payload = payload;
        return api;
      },
      update: (payload) => {
        state.op = "update";
        state.payload = payload;
        return api;
      },
      eq: (col, val) => {
        state.filters.push(["eq", col, val]);
        return api;
      },
      gte: (col, val) => {
        state.filters.push(["gte", col, val]);
        return api;
      },
      is: (col, val) => {
        state.filters.push(["is", col, val]);
        return api;
      },
      single: () => {
        state.single = true;
        return api;
      },
      maybeSingle: () => {
        state.maybeSingle = true;
        return api;
      },
      then: (resolve) => resolve(execute(db, state)),
    };
    return api;
  }

  return {
    from: builder,
    auth: {
      getUser: async () => ({ data: { user: { id: TEST_USER_ID, email: "test@example.com" } }, error: null }),
    },
    storage: {
      from: () => ({
        download: async () => ({ data: { arrayBuffer: async () => new ArrayBuffer(8) }, error: null }),
      }),
    },
  };
}

function matchesFilters(row, filters) {
  return filters.every(([kind, col, val]) => {
    if (kind === "eq") return row[col] === val;
    if (kind === "is") return (row[col] ?? null) === val;
    if (kind === "gte") return row[col] >= val;
    return true;
  });
}

function execute(db, state) {
  const { table, op, filters, payload } = state;

  if (table === "profiles") {
    const rows = [...db.profiles.values()].filter((r) => matchesFilters(r, filters));
    if (op === "select") return { data: state.maybeSingle ? rows[0] ?? null : rows, error: null };
    if (op === "update") {
      const updated = rows.map((r) => Object.assign(r, payload));
      return { data: state.maybeSingle ? updated[0] ?? null : updated, error: null };
    }
  }

  if (table === "claims") {
    const rows = [...db.claims.values()].filter((r) => matchesFilters(r, filters));
    return { data: state.maybeSingle ? rows[0] ?? null : rows, error: null };
  }

  if (table === "review_files") {
    const rows = db.review_files.filter((r) => matchesFilters(r, filters));
    return { data: rows, error: null };
  }

  if (table === "items") {
    const rows = db.items.filter((r) => matchesFilters(r, filters));
    return { data: rows, error: null };
  }

  if (table === "analysis_runs") {
    if (op === "insert") {
      const row = { id: `run_${db.analysis_runs.size + 1}`, ...payload };
      db.analysis_runs.set(row.id, row);
      return { data: state.single ? row : [row], error: null, count: null };
    }
    if (op === "update") {
      const rows = [...db.analysis_runs.values()].filter((r) => matchesFilters(r, filters));
      rows.forEach((r) => Object.assign(r, payload));
      return { data: rows, error: null };
    }
    if (op === "select" && state.countOnly) {
      const rows = [...db.analysis_runs.values()].filter((r) => matchesFilters(r, filters));
      return { data: null, error: null, count: rows.length };
    }
  }

  if (table === "review_findings") {
    if (op === "insert") {
      const rows = Array.isArray(payload) ? payload : [payload];
      db.review_findings.push(...rows);
      return { data: rows, error: null };
    }
  }

  throw new Error(`Unhandled fake query: ${table} ${op}`);
}

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
    findings: [{ item_id: "i1", title: "Missing flashing", scope_status: "not_found_in_estimate", reason: "x", confidence: "low", requires_human_verification: true }],
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
  return new Request("https://example.com/.netlify/functions/analyze-review", {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  db = makeDb();
  stripeUpdateMock.mockClear();
  process.env.SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = "fake-service-key";
  process.env.VITE_SUPABASE_ANON_KEY = "fake-anon-key";
  process.env.ANTHROPIC_API_KEY = "fake-anthropic-key";
  process.env.STRIPE_SECRET_KEY = "fake-stripe-key";
});

describe("analyze-review paywall + free-review gate", () => {
  it("a new trialing customer gets exactly one free review, and it ends their trial", async () => {
    const { default: handler } = await import("../analyze-review.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(res.status).toBe(200);
    expect(db.profiles.get(TEST_USER_ID).free_review_used_at).not.toBeNull();
    expect(stripeUpdateMock).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID, { trial_end: "now" });
  });

  it("the same account cannot redeem a second free review", async () => {
    const { default: handler } = await import("../analyze-review.js");
    const first = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(first.status).toBe(200);

    stripeUpdateMock.mockClear();
    const second = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(second.status).toBe(409);
    expect(stripeUpdateMock).not.toHaveBeenCalled();
  });

  it("a review that fails does not consume the free-review entitlement", async () => {
    const { analyzeEstimate } = await import("../_lib/estimateAnalysisService.js");
    analyzeEstimate.mockRejectedValueOnce(new Error("model exploded"));

    const { default: handler } = await import("../analyze-review.js");
    const failed = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(failed.status).toBe(502);
    expect(db.profiles.get(TEST_USER_ID).free_review_used_at).toBeNull();

    // Entitlement was released, so a retry should succeed.
    const retried = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(retried.status).toBe(200);
  });

  it.each(["active"])("a paying customer (%s) is not blocked by the free-review gate", async (status) => {
    db.profiles.get(TEST_USER_ID).subscription_status = status;
    const { default: handler } = await import("../analyze-review.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
    expect(res.status).toBe(200);
    // Active customers never had a trial to end — no Stripe call expected.
    expect(stripeUpdateMock).not.toHaveBeenCalled();
  });

  it.each([null, "canceled", "past_due", "unpaid", "incomplete", "incomplete_expired"])(
    "the server rejects analysis for subscription_status=%s (frontend-only gating can't be trusted)",
    async (status) => {
      db.profiles.get(TEST_USER_ID).subscription_status = status;
      const { default: handler } = await import("../analyze-review.js");
      const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID }));
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toMatch(/subscribe/i);
    },
  );
});
