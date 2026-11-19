import Anthropic from "@anthropic-ai/sdk";

// ============================================================================
// voiceNoteService — turns a raw speech-to-text transcript into a short
// title plus an organized, readable note. The ONLY module that talks to an
// AI provider for this feature, same separation as estimateAnalysisService.js.
//
// Model choice: Haiku, same reasoning as estimateAnalysisService.js — this
// is a short, cheap call (a transcript, not a full estimate + knowledge
// base), and nothing here needs Sonnet/Opus-level reasoning.
// ============================================================================

const DEFAULT_MODEL = process.env.VOICE_NOTE_MODEL || "claude-haiku-4-5";
const MAX_OUTPUT_TOKENS = 1024;
// A spoken note has no real reason to run longer than this — caps both the
// prompt size and, with it, cost per call. The frontend also stops
// recognition well before this, this is a hard backstop against an
// abusive direct call to the function.
const MAX_TRANSCRIPT_CHARS = 12000;

const SYSTEM_PROMPT = `You turn a contractor's raw, rambling, spoken field note — captured by speech-to-text while they walk a jobsite — into a short, clean, organized write-up for their own project file.

STRICT RULES:
- Never invent a detail, measurement, room, or observation that isn't in the transcript. If speech-to-text produced a word or phrase that doesn't make sense in context, write "[unclear]" at that spot rather than guessing a replacement.
- Never add an opinion, recommendation, or conclusion the contractor didn't actually say.
- Keep every concrete fact the contractor stated: rooms/areas, materials, measurements, visible damage, dates, names — nothing gets dropped for brevity.
- Organize by area/room when the transcript mentions more than one; otherwise just clean prose or a short bullet list, whichever fits what was said.
- Fix obvious speech-to-text artifacts only when the intended word is unambiguous from context (e.g. "dry wall" to "drywall", a stray "um" removed) — never when it would change meaning.
- Keep the tone plain and factual, like a contractor's own field note — never salesy, never a legal or coverage statement, never addressed to anyone.
- "title" is a short label for this note (4-8 words), not a sentence.

OUTPUT FORMAT: respond with ONLY a single valid JSON object, no markdown fences, no prose before or after:
{
  "title": "<short label>",
  "note": "<the cleaned, organized note>"
}`;

function coerceResult(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.title !== "string" || !raw.title.trim()) return null;
  if (typeof raw.note !== "string" || !raw.note.trim()) return null;
  return {
    title: raw.title.trim().slice(0, 200),
    note: raw.note.trim().slice(0, 8000),
  };
}

/**
 * The one function the rest of the app calls. Returns { title, note } or
 * throws, which the caller (voice-note.js) turns into a 502 — never
 * returns a fabricated result on a parse failure.
 */
export async function cleanVoiceNote(transcript) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const trimmed = (transcript || "").trim();
  if (!trimmed) throw new Error("Transcript is empty");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // maxRetries: 0, same reasoning as estimateAnalysisService.js — the SDK's
  // default retries would silently multiply this timeout. A transcript is
  // small (capped above) so a generous-but-bounded 25s, well inside a
  // regular synchronous Netlify Function's budget, is safe here in a way
  // it never was for the full estimate-analysis call — no background
  // function needed for this one.
  const response = await client.messages.create(
    {
      model: DEFAULT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: trimmed.slice(0, MAX_TRANSCRIPT_CHARS) }],
    },
    { timeout: 25_000, maxRetries: 0 },
  );

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Model returned no text content");

  let parsed;
  try {
    const cleaned = textBlock.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  const result = coerceResult(parsed);
  if (!result) throw new Error("Model returned an incomplete result");
  return result;
}
