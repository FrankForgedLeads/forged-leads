import { PDFParse } from "pdf-parse";

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
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return (result.text || "").trim();
  } finally {
    await parser.destroy();
  }
}
