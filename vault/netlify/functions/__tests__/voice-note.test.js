// Tests for voice-note.js: auth/claim-ownership check, the same
// trialing/active paywall as review-analyze.js, the daily rate limit, and
// that a cleaned note actually gets persisted with its raw transcript
// alongside it. The actual Claude call is mocked (see
// _lib/voiceNoteService.js's own file for that prompt/parsing logic) —
// this only exercises the function's own request handling.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeDb, makeFakeClient, TEST_USER_ID, TEST_CLAIM_ID } from "./_testUtils.js";

let db;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => makeFakeClient(db),
}));

vi.mock("../_lib/voiceNoteService.js", () => ({
  cleanVoiceNote: vi.fn(async () => ({ title: "Kitchen water damage", note: "Cleaned note text." })),
}));

function makeRequest(body) {
  return new Request("https://example.com/.netlify/functions/voice-note", {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  db = makeDb();
  process.env.SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = "fake-service-key";
  process.env.VITE_SUPABASE_ANON_KEY = "fake-anon-key";
  process.env.ANTHROPIC_API_KEY = "fake-anthropic-key";
  delete process.env.VOICE_NOTE_DAILY_LIMIT;
  const { cleanVoiceNote } = await import("../_lib/voiceNoteService.js");
  cleanVoiceNote.mockClear();
});

describe("voice-note", () => {
  it("cleans a transcript and saves the note, keeping the raw transcript alongside it", async () => {
    const { default: handler } = await import("../voice-note.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID, transcript: "uh the kitchen has water damage" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Kitchen water damage");
    expect(body.note).toBe("Cleaned note text.");
    expect(body.raw_transcript).toBe("uh the kitchen has water damage");
    expect(db.claim_voice_notes).toHaveLength(1);
    expect(db.claim_voice_notes[0].user_id).toBe(TEST_USER_ID);
  });

  it("rejects an empty transcript", async () => {
    const { default: handler } = await import("../voice-note.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID, transcript: "   " }));
    expect(res.status).toBe(400);
    expect(db.claim_voice_notes).toHaveLength(0);
  });

  it("404s for a claim the caller doesn't own (or that doesn't exist)", async () => {
    const { default: handler } = await import("../voice-note.js");
    const res = await handler(makeRequest({ claimId: "no_such_claim", transcript: "hello" }));
    expect(res.status).toBe(404);
  });

  it.each([null, "canceled", "past_due"])(
    "rejects when subscription_status=%s (server-side paywall, same as review-analyze.js)",
    async (status) => {
      db.profiles.get(TEST_USER_ID).subscription_status = status;
      const { default: handler } = await import("../voice-note.js");
      const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID, transcript: "hello" }));
      expect(res.status).toBe(402);
      expect(db.claim_voice_notes).toHaveLength(0);
    },
  );

  it("enforces the daily rate limit per user", async () => {
    process.env.VOICE_NOTE_DAILY_LIMIT = "2";
    const now = new Date().toISOString();
    db.claim_voice_notes.push(
      { id: "a", claim_id: TEST_CLAIM_ID, user_id: TEST_USER_ID, created_at: now, title: "a", note: "a", raw_transcript: "a" },
      { id: "b", claim_id: TEST_CLAIM_ID, user_id: TEST_USER_ID, created_at: now, title: "b", note: "b", raw_transcript: "b" },
    );
    const { default: handler } = await import("../voice-note.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID, transcript: "one more" }));
    expect(res.status).toBe(429);
    expect(db.claim_voice_notes).toHaveLength(2);
  });

  it("returns 502 and saves nothing if the cleanup call fails", async () => {
    const { cleanVoiceNote } = await import("../_lib/voiceNoteService.js");
    cleanVoiceNote.mockRejectedValueOnce(new Error("model exploded"));
    const { default: handler } = await import("../voice-note.js");
    const res = await handler(makeRequest({ claimId: TEST_CLAIM_ID, transcript: "hello" }));
    expect(res.status).toBe(502);
    expect(db.claim_voice_notes).toHaveLength(0);
  });
});
