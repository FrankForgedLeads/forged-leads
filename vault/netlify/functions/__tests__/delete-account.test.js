// Tests for delete-account.js — self-serve account deletion. Covers: a
// normal solo account deletes cleanly and cancels its Stripe subscription,
// a Crew owner with teammates is blocked rather than silently cutting off
// their access, and uploaded files get cleaned out of Storage. Cascading
// deletion of claims/documents/findings themselves is Postgres's job (the
// `on delete cascade` foreign keys in supabase/migration.sql) and isn't
// re-tested here — see that file's own comments for the real guarantee.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeDb, makeFakeClient, TEST_USER_ID, TEST_SUBSCRIPTION_ID } from "./_testUtils.js";

let db;
const stripeCancelMock = vi.fn(async () => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => makeFakeClient(db),
}));

vi.mock("stripe", () => ({
  default: class FakeStripe {
    subscriptions = { cancel: stripeCancelMock };
  },
}));

function makeRequest() {
  return new Request("https://example.com/.netlify/functions/delete-account", {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
  });
}

beforeEach(() => {
  db = makeDb();
  stripeCancelMock.mockClear();
  process.env.SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = "fake-service-key";
  process.env.VITE_SUPABASE_ANON_KEY = "fake-anon-key";
  process.env.STRIPE_SECRET_KEY = "fake-stripe-key";
});

describe("delete-account", () => {
  it("deletes a solo account, cancels its subscription, and removes its uploaded files", async () => {
    db.storageObjects = [
      `${TEST_USER_ID}/claimA/estimate.pdf`,
      `${TEST_USER_ID}/claimA/photo1.jpg`,
      `${TEST_USER_ID}/claimB/notes.pdf`,
    ];

    const { default: handler } = await import("../delete-account.js");
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);

    expect(stripeCancelMock).toHaveBeenCalledWith(TEST_SUBSCRIPTION_ID);
    expect(db.profiles.has(TEST_USER_ID)).toBe(false);
    expect(db.storageObjects).toHaveLength(0);
  });

  it("does not fail the deletion if the Stripe cancel call itself errors", async () => {
    stripeCancelMock.mockRejectedValueOnce(new Error("already canceled"));
    const { default: handler } = await import("../delete-account.js");
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
    expect(db.profiles.has(TEST_USER_ID)).toBe(false);
  });

  it("blocks deletion for a Crew owner who still has other team members", async () => {
    db.teams.set("team1", { id: "team1", owner_id: TEST_USER_ID });
    db.profiles.set("teammate1", { id: "teammate1", team_id: "team1", subscription_status: "active" });

    const { default: handler } = await import("../delete-account.js");
    const res = await handler(makeRequest());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/team/i);
    // Nothing should have been deleted or canceled.
    expect(db.profiles.has(TEST_USER_ID)).toBe(true);
    expect(stripeCancelMock).not.toHaveBeenCalled();
  });

  it("allows deletion for a Crew owner whose team has no other members", async () => {
    db.teams.set("team1", { id: "team1", owner_id: TEST_USER_ID });

    const { default: handler } = await import("../delete-account.js");
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
    expect(db.profiles.has(TEST_USER_ID)).toBe(false);
  });
});
