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
    teams: new Map(),
    storageObjects: [], // [{ path }] — used by delete-account.test.js
    analysis_runs: new Map(),
    review_findings: [],
    claim_voice_notes: [],
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
      neq: (col, val) => {
        state.filters.push(["neq", col, val]);
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
      // Mirrors Supabase JS's .not(column, operator, value), which negates
      // the given operator. Only "is" is needed so far (checking a column
      // IS NOT a given value, e.g. IS NOT NULL).
      not: (col, op, val) => {
        if (op !== "is") throw new Error(`Fake client's .not() only supports the "is" operator, got "${op}"`);
        state.filters.push(["not_is", col, val]);
        return api;
      },
      // Mirrors Supabase JS's .or("col.op.val,col.op.val"), real syntax
      // used by review-analyze-background.js's state filter. Only "is"
      // (against the literal string "null") and "eq" are needed so far.
      or: (filterString) => {
        state.filters.push(["or", null, filterString]);
        return api;
      },
      // No-op in this fake — nothing here returns enough rows for a limit
      // to matter, but real code calls it and the builder must accept it.
      limit: () => api,
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
      // Used by delete-account.test.js. Simulates the real cascade just
      // enough for that test's own assertions — this is a fake, not a
      // re-implementation of Postgres's actual `on delete cascade` (that's
      // verified by reading the foreign keys in migration.sql instead).
      admin: {
        deleteUser: async (id) => {
          db.profiles.delete(id);
          for (const [claimId, claim] of db.claims) {
            if (claim.user_id === id) db.claims.delete(claimId);
          }
          return { data: {}, error: null };
        },
      },
    },
    storage: {
      from: () => ({
        download: async () => ({ data: { arrayBuffer: async () => new ArrayBuffer(8) }, error: null }),
        // db.storageObjects holds full paths as plain strings (e.g.
        // "userId/claimId/file.jpg"). list() returns the immediate
        // children of a prefix, matching the one level at a time shape
        // Supabase Storage's own .list() returns.
        list: async (prefix) => {
          const names = new Set(
            db.storageObjects
              .filter((p) => p.startsWith(`${prefix}/`))
              .map((p) => p.slice(prefix.length + 1).split("/")[0]),
          );
          return { data: [...names].map((name) => ({ name })), error: null };
        },
        remove: async (paths) => {
          db.storageObjects = db.storageObjects.filter((p) => !paths.includes(p));
          return { data: paths.map((path) => ({ path })), error: null };
        },
      }),
    },
  };
}

function matchesFilters(row, filters) {
  return filters.every(([kind, col, val]) => {
    if (kind === "eq") return row[col] === val;
    if (kind === "neq") return row[col] !== val;
    if (kind === "is") return (row[col] ?? null) === val;
    if (kind === "not_is") return (row[col] ?? null) !== val;
    if (kind === "gte") return row[col] >= val;
    if (kind === "or") {
      // val here is the raw "col.op.val,col.op.val" string (col/the
      // second array slot is unused for this kind — see the .or() builder
      // method above).
      return val.split(",").some((clause) => {
        const [orCol, op, orVal] = clause.split(".");
        if (op === "is") return (row[orCol] ?? null) === (orVal === "null" ? null : orVal);
        if (op === "eq") return row[orCol] === orVal;
        throw new Error(`Fake client's .or() only supports "is"/"eq" clauses, got "${op}"`);
      });
    }
    return true;
  });
}

function execute(db, state) {
  const { table, op, filters, payload } = state;

  if (table === "profiles") {
    const rows = [...db.profiles.values()].filter((r) => matchesFilters(r, filters));
    if (op === "select") {
      if (state.countOnly) return { data: null, error: null, count: rows.length };
      return { data: state.maybeSingle ? rows[0] ?? null : rows, error: null };
    }
    if (op === "update") {
      const updated = rows.map((r) => Object.assign(r, payload));
      return { data: state.maybeSingle ? updated[0] ?? null : updated, error: null };
    }
  }

  if (table === "claims") {
    const rows = [...db.claims.values()].filter((r) => matchesFilters(r, filters));
    return { data: state.maybeSingle ? rows[0] ?? null : rows, error: null };
  }

  if (table === "teams") {
    const rows = [...db.teams.values()].filter((r) => matchesFilters(r, filters));
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

  if (table === "claim_voice_notes") {
    if (op === "insert") {
      const row = { id: `note_${db.claim_voice_notes.length + 1}`, created_at: new Date().toISOString(), ...payload };
      db.claim_voice_notes.push(row);
      return { data: state.single ? row : [row], error: null };
    }
    if (op === "select") {
      const rows = db.claim_voice_notes.filter((r) => matchesFilters(r, filters));
      if (state.countOnly) return { data: null, error: null, count: rows.length };
      return { data: state.maybeSingle ? rows[0] ?? null : rows, error: null };
    }
  }

  throw new Error(`Unhandled fake query: ${table} ${op}`);
}
