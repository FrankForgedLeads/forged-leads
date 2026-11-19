// Deliberately does NOT mock pdf-parse/pdfjs-dist — the bug this guards
// against (production crash, ultimately traced to pdfjs-dist's "fake
// worker" doing `await import("./pdf.worker.mjs")`, a relative specifier
// that 404s once esbuild bundles everything into one file for deployment)
// only showed up against the real, bundled library. Confirmed the actual
// fix two ways:
//   1. Directly executing an esbuild bundle of pdfText.js (matching
//      Netlify's real build) against this fixture, with the native
//      @napi-rs/canvas binary deliberately removed from node_modules to
//      reproduce the exact production condition — succeeded.
//   2. The globalThis.pdfjsWorker test below, which is environment-
//      independent and doesn't depend on that binary being present or
//      absent.
// This sandbox's node_modules happens to have a working
// @napi-rs/canvas-linux-x64-gnu binary normally, so the extraction test
// below alone can't force the "module missing" condition — that's what
// method 1 above was for, done manually rather than as an automated test
// here (bundling + deleting a dependency isn't something to run on every
// `npm test`).
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

describe("pdfjs-dist worker escape hatch (pdfDomPolyfills.js)", () => {
  it("pre-supplies globalThis.pdfjsWorker.WorkerMessageHandler so pdfjs-dist skips its broken dynamic import", () => {
    // pdfjs-dist's fake-worker setup checks this exact shape
    // (globalThis.pdfjsWorker?.WorkerMessageHandler) before falling back
    // to `await import(workerSrc)` — see PDFWorker's
    // #mainThreadWorkerMessageHandler getter in pdfjs-dist's source.
    expect(globalThis.pdfjsWorker).toBeDefined();
    expect(typeof globalThis.pdfjsWorker.WorkerMessageHandler).toBe("function");
  });
});
