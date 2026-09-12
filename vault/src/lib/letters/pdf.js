import { formatCurrency } from "../format.js";
import { buildLetterParagraphs } from "./templates.js";
import { VAULT_DISCLAIMER } from "../disclaimer.js";

const MARGIN = 54; // 0.75in
const PAGE_WIDTH = 612; // US Letter, pt
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_RESERVE = 46; // space kept clear at the bottom for the disclaimer

/**
 * Builds the letter PDF and returns the jsPDF document. Caller decides
 * whether to .save() (triggers a browser download) or pull a blob/data URI
 * for something else.
 *
 * jsPDF (~1MB with its optional html2canvas dependency) is dynamically
 * imported here so it only loads for someone actually exporting a letter,
 * not bundled into every visitor's initial page load.
 */
export async function generateLetterPdf({ templateKey, fields, itemRows }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = MARGIN;

  function ensureSpace(needed) {
    if (y + needed > PAGE_HEIGHT - FOOTER_RESERVE) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function paragraph(text, { size = 10.5, gapBefore = 10, lineHeight = 14, bold = false } = {}) {
    if (!text) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    ensureSpace(gapBefore + lines.length * lineHeight);
    y += gapBefore;
    for (const line of lines) {
      doc.text(line, MARGIN, y);
      y += lineHeight;
    }
  }

  // --- Company block (top-left) + date (top-right) ------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(fields.companyName || "Your Company", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(fields.letterDate || "", PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 16;

  const companyLines = [fields.contactName, fields.contactPhone, fields.contactEmail].filter(
    Boolean,
  );
  doc.setFontSize(10);
  for (const line of companyLines) {
    doc.text(line, MARGIN, y);
    y += 13;
  }

  // --- To / Re block --------------------------------------------------------
  paragraph(
    [fields.carrier, fields.adjusterName ? `Attn: ${fields.adjusterName}` : null]
      .filter(Boolean)
      .join("\n"),
    { gapBefore: 18, bold: true },
  );

  const reParts = [
    fields.claimNumber ? `Claim #${fields.claimNumber}` : null,
    fields.insuredName ? `Insured: ${fields.insuredName}` : null,
    fields.propertyAddress ? `Property: ${fields.propertyAddress}` : null,
    fields.dateOfLoss ? `Date of Loss: ${fields.dateOfLoss}` : null,
  ].filter(Boolean);
  if (reParts.length) {
    paragraph(`Re: ${reParts.join(" · ")}`, { gapBefore: 10 });
  }

  // --- Salutation + body ------------------------------------------------
  paragraph(fields.adjusterName ? `Dear ${fields.adjusterName},` : "To Whom It May Concern,", {
    gapBefore: 20,
  });

  const { opening, afterItems, closing } = buildLetterParagraphs(templateKey, fields);
  for (const p of opening) paragraph(p, { gapBefore: 14 });

  // --- Itemized list --------------------------------------------------------
  itemRows.forEach((row, i) => {
    const codeLine = [row.code, row.citation].filter(Boolean).join(" · ");
    const title = `${i + 1}. ${row.title}${codeLine ? ` (${codeLine})` : ""}`;
    const amountStr = formatCurrency(row.lineTotal);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    const titleWidth = CONTENT_WIDTH - 80;
    const titleLines = doc.splitTextToSize(title, titleWidth);
    ensureSpace(titleLines.length * 13 + 12 + 12);
    y += 12;
    titleLines.forEach((line, idx) => {
      doc.text(line, MARGIN, y);
      if (idx === 0) doc.text(amountStr, PAGE_WIDTH - MARGIN, y, { align: "right" });
      y += 13;
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    const detail = `Qty: ${row.quantity} ${row.unit || ""} × ${formatCurrency(row.unitAmount)}/${row.unit || "unit"}${row.note ? ` — ${row.note}` : ""}`;
    const detailLines = doc.splitTextToSize(detail, CONTENT_WIDTH - 14);
    ensureSpace(detailLines.length * 12);
    for (const line of detailLines) {
      doc.text(line, MARGIN + 14, y);
      y += 12;
    }
    doc.setTextColor(0);
  });

  for (const p of afterItems) paragraph(p, { gapBefore: 16, bold: true });
  if (fields.additionalNote) paragraph(fields.additionalNote, { gapBefore: 14 });
  for (const p of closing) paragraph(p, { gapBefore: 14 });

  // --- Signature ------------------------------------------------------------
  paragraph("Sincerely,", { gapBefore: 24 });
  const sigLines = [fields.contactName, fields.companyName, fields.contactPhone, fields.contactEmail]
    .filter(Boolean)
    .join("\n");
  paragraph(sigLines, { gapBefore: 20 });

  // --- Disclaimer footer on every page --------------------------------------
  // The disclaimer is long enough to wrap to 2 lines at this width, so the
  // page-number goes on its own line *after* the wrapped text — printing it
  // at the same fixed y as line 1 (an earlier version of this code) made it
  // overlap whichever disclaimer line happened to run long.
  const pageCount = doc.getNumberOfPages();
  const footerLines = doc.splitTextToSize(VAULT_DISCLAIMER, CONTENT_WIDTH);
  const footerLineHeight = 10;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    let fy = PAGE_HEIGHT - MARGIN + 8;
    for (const line of footerLines) {
      doc.text(line, MARGIN, fy);
      fy += footerLineHeight;
    }
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, fy, { align: "right" });
    doc.setTextColor(0);
  }

  return doc;
}
