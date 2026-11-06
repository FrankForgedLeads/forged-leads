// Side-effect import — must finish running before pdfjs-dist is loaded at
// all (not just before it's used). See pdfDomPolyfills.js for the full
// explanation: pdf-parse pulls in pdfjs-dist, whose own module-load-time
// code crashes without these globals present first, and the only way to
// guarantee "before" is to keep this a static import (which always runs
// first) while making every pdfjs-dist-touching import below it dynamic
// (which only run when actually awaited, i.e. after this line).
import "./pdfDomPolyfills.js";

// Pre-supplies what pdfjs-dist's own broken dynamic import of its worker
// script would have returned (see pdfDomPolyfills.js) — must be set up
// before pdf-parse is loaded. Memoized so repeated calls within the same
// warm function instance don't redo the import.
let pdfjsWorkerReady;
function ensurePdfjsWorkerReady() {
  if (!pdfjsWorkerReady) {
    pdfjsWorkerReady = import("pdfjs-dist/legacy/build/pdf.worker.mjs").then(
      ({ WorkerMessageHandler }) => {
        globalThis.pdfjsWorker = { WorkerMessageHandler };
      },
    );
  }
  return pdfjsWorkerReady;
}

// A real, text-based PDF export (the normal case for Xactimate) extracts to
// a meaningful amount of text. A scanned/photographed estimate saved as a
// PDF extracts to little or nothing — that's the signal used to tell the
// caller "we can't read this" instead of silently proceeding on an empty
// string, which would let the model either fail confusingly or, worse,
// fabricate findings from nothing.
export const MIN_MEANINGFUL_TEXT_LENGTH = 50;

/**
 * Extracts plain text from a PDF file's bytes. Returns "" (not an error) on
 * a PDF that parses but yields no meaningful text — callers should check
 * against MIN_MEANINGFUL_TEXT_LENGTH themselves and message the user
 * accordingly, distinguishing "we couldn't read this" from "an error broke
 * the review."
 */
export async function extractPdfText(buffer) {
  await ensurePdfjsWorkerReady();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return (result.text || "").trim();
  } finally {
    await parser.destroy();
  }
}
