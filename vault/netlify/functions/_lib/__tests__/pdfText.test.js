// Deliberately does NOT mock pdf-parse/pdfjs-dist — the bug this guards
// against (production crash: "ReferenceError: DOMMatrix is not defined")
// only showed up against the real library. Note on reproducing it here:
// this sandbox's node_modules happens to have a working
// @napi-rs/canvas-linux-x64-gnu binary (pdf-parse's own, native, normal
// fallback for this), so the extraction test below can't actually force
// the "module missing" failure locally the way it genuinely failed on
// Netlify's deployed function — there's nothing broken to trigger it
// against in this environment. What the DOMMatrixPolyfill test below
// proves instead, environment-independently: pdfDomPolyfills.js sets
// globalThis.DOMMatrix correctly, and it does so by being imported first
// in pdfText.js (module evaluation order), which is what makes this fix
// work regardless of whether Netlify's bundler ships that binary or not
// — our own polyfill wins the race before pdf-parse ever checks.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, it, expect } from "vitest";
import { extractPdfText, MIN_MEANINGFUL_TEXT_LENGTH } from "../pdfText.js";
import "../pdfDomPolyfills.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = readFileSync(join(__dirname, "fixtures", "sample-estimate.pdf"));

describe("extractPdfText", () => {
  it("extracts text from a real estimate PDF without crashing", async () => {
    const text = await extractPdfText(SAMPLE_PDF);
    expect(text.length).toBeGreaterThan(MIN_MEANINGFUL_TEXT_LENGTH);
    expect(text).toContain("Roofing");
  });
});

describe("DOMMatrix polyfill (pdfDomPolyfills.js)", () => {
  it("is installed as globalThis.DOMMatrix", () => {
    expect(globalThis.DOMMatrix).toBeDefined();
  });

  it("matches the exact call pdfjs-dist's worker makes (scaleSelf then translateSelf)", () => {
    // From pdfjs-dist/legacy/build/pdf.worker.mjs — the real call site
    // that crashed in production:
    //   new DOMMatrix().scaleSelf(1 / width, -1 / height).translateSelf(0, -height)
    const width = 10;
    const height = 20;
    const { a, b, c, d, e, f } = new globalThis.DOMMatrix()
      .scaleSelf(1 / width, -1 / height)
      .translateSelf(0, -height);
    expect(a).toBeCloseTo(1 / width);
    expect(b).toBeCloseTo(0);
    expect(c).toBeCloseTo(0);
    expect(d).toBeCloseTo(-1 / height);
    expect(e).toBeCloseTo(0);
    expect(f).toBeCloseTo(height / height); // -1/height * -height = 1
  });
});
