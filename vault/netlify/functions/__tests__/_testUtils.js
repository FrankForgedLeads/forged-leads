// Shared in-memory fake Supabase client used by review-analyze.test.js and
// review-analyze-background.test.js — the two functions split from one
// original review-analyze.js (see both files' own top comments for why:
// the AI call genuinely takes longer than any safe synchronous-function
// timeout, so it moved into a Netlify Background Function). Both still
// talk to the "same" fake database shape, so this is one shared fake
// rather than two copies drifting apart.
export const TEST_USER_ID = "11111111-1111-1111-1111-111111111111";
export const TEST_CLAIM_ID = "22222222-2222-2222-2222-222222222222";
export const TEST_SUBSCRIPTION_ID = "sub_test123";

export function makeDb() {
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

export function makeFakeClient(db) {
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
    if (op === "select") {
      const rows = [...db.analysis_runs.values()].filter((r) => matchesFilters(r, filters));
      if (state.countOnly) return { data: null, error: null, count: rows.length };
      return { data: state.maybeSingle ? rows[0] ?? null : rows, error: null };
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
