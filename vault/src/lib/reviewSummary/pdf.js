import { formatCurrency, formatRange, formatDate, formatBytes } from "../format.js";
import { lineTotal, unitAmount, claimTotal } from "../claimMath.js";
import { ANALYSIS_DISCLAIMER, VAULT_DISCLAIMER } from "../disclaimer.js";

const MARGIN = 54; // 0.75in
const PAGE_WIDTH = 612; // US Letter, pt
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_RESERVE = 58; // this footer carries two disclaimers, taller than the letter's

const SCOPE_STATUS_LABEL = {
  not_found_in_estimate: "Potentially Missing",
  quantity_mismatch: "Quantity May Not Match Documented Scope",
  code_required: "Code Reference May Apply — Verify",
};

const FINDING_STATUS_LABEL = {
  new: "Pending review",
  added: "Added to review",
  dismissed: "Dismissed",
  needs_info: "Needs more information",
};

const FILE_TYPE_LABEL = { estimate: "Estimate", photo: "Photo", document: "Document" };

/**
 * Builds the Review Summary PDF and returns the jsPDF document — a
 * point-in-time record of this review for the contractor's own file: the
 * project info, attached items and running total, documents on hand, and
 * every Vault Review finding with its human decision. Distinct from a
 * carrier letter (see ../letters/pdf.js): this never leaves the
 * contractor's file addressed to anyone, so it carries no "Dear
 * Adjuster"-style framing — just a record of what Vault surfaced and what
 * was decided about each item.
 *
 * jsPDF is dynamically imported here for the same reason as the letter
 * export: keep it out of the initial bundle for visitors who never
 * generate a PDF.
 */
export async function generateReviewSummaryPdf({ claim, rows, findings, files }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = MARGIN;

  function ensureSpace(needed) {
    if (y + needed > PAGE_HEIGHT - FOOTER_RESERVE) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function heading(text) {
    ensureSpace(28);
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text(text, MARGIN, y);
    y += 4;
    doc.setDrawColor(200);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 14;
  }

  function paragraph(text, { size = 10, gapBefore = 8, lineHeight = 13, bold = false, color = 0 } = {}) {
    if (!text) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    ensureSpace(gapBefore + lines.length * lineHeight);
    y += gapBefore;
    for (const line of lines) {
      doc.text(line, MARGIN, y);
      y += lineHeight;
    }
    doc.setTextColor(0);
  }

  function labelValueRow(pairs) {
    // Two label/value pairs per line, laid out in fixed columns.
    const colWidth = CONTENT_WIDTH / 2;
    ensureSpace(30);
    y += 14;
    const rowY = y;
    pairs.forEach(([label, value], i) => {
      if (!value) return;
      const x = MARGIN + i * colWidth;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(110);
      doc.text(label.toUpperCase(), x, rowY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(String(value), x, rowY + 13);
    });
    y = rowY + 13;
  }

  // --- Title ----------------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Estimate Review Summary", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Generated ${formatDate(new Date().toISOString())}`, PAGE_WIDTH - MARGIN, y, { align: "right" });
  doc.setTextColor(0);
  y += 18;
  paragraph(claim.project_type || claim.claim_number || claim.insured_name || "Untitled review", {
    size: 11,
    bold: true,
    gapBefore: 0,
  });

  // --- Project info -----------------------------------------------------------
  heading("Project Info");
  labelValueRow([
    ["Trade", claim.trade],
    ["Property location", claim.property_address],
  ]);
  labelValueRow([
    ["Insured / client", claim.insured_name],
    ["Estimate total", claim.estimate_total ? formatCurrency(claim.estimate_total) : null],
  ]);
  labelValueRow([
    ["Date of loss", claim.date_of_loss],
    ["Loss type", claim.loss_type],
  ]);
  labelValueRow([
    ["Claim number", claim.claim_number],
    ["Carrier", claim.carrier],
  ]);
  labelValueRow([["Adjuster name", claim.adjuster_name]]);
  if (claim.description) paragraph(claim.description, { gapBefore: 12 });

  // --- Documents on file ------------------------------------------------------
  if (files.length > 0) {
    heading("Documents On File");
    for (const f of files) {
      paragraph(`• ${f.file_name} — ${FILE_TYPE_LABEL[f.file_type] ?? f.file_type} (${formatBytes(f.size_bytes)})`, {
        gapBefore: 4,
        lineHeight: 12,
      });
    }
  }

  // --- Attached items ---------------------------------------------------------
  heading(`Attached Items (${rows.length})`);
  if (rows.length === 0) {
    paragraph("No items attached to this review yet.", { gapBefore: 4, color: 110 });
  } else {
    for (const row of rows) {
      const item = row.items;
      const codeLine = [item?.xactimate_code, item?.code_citation].filter(Boolean).join(" · ");
      const title = `${item?.title ?? "Item"}${codeLine ? ` (${codeLine})` : ""}`;
      const amountStr = formatCurrency(lineTotal(row));

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const titleLines = doc.splitTextToSize(title, CONTENT_WIDTH - 80);
      ensureSpace(titleLines.length * 12 + 10 + 12);
      y += 10;
      titleLines.forEach((line, idx) => {
        doc.text(line, MARGIN, y);
        if (idx === 0) doc.text(amountStr, PAGE_WIDTH - MARGIN, y, { align: "right" });
        y += 12;
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(110);
      const detail = `Qty: ${row.quantity} ${item?.unit || ""} × ${formatCurrency(unitAmount(row))}/${item?.unit || "unit"}${row.note ? ` — ${row.note}` : ""}`;
      const detailLines = doc.splitTextToSize(detail, CONTENT_WIDTH - 14);
      ensureSpace(detailLines.length * 11);
      for (const line of detailLines) {
        doc.text(line, MARGIN + 14, y);
        y += 11;
      }
      doc.setTextColor(0);
    }

    ensureSpace(20);
    y += 10;
    doc.setDrawColor(200);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Running total", MARGIN, y);
    doc.text(formatCurrency(claimTotal(rows)), PAGE_WIDTH - MARGIN, y, { align: "right" });
    y += 4;
  }

  // --- Vault Review findings ---------------------------------------------------
  if (findings.length > 0) {
    heading(`Vault Review Findings (${findings.length})`);
    paragraph(
      "These figures are review estimates only. They are not a guarantee of payment, coverage, reimbursement, or claim outcome.",
      { size: 8.5, gapBefore: 0, color: 110 },
    );

    for (const f of findings) {
      const item = f.items;
      ensureSpace(60);
      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const titleLines = doc.splitTextToSize(f.title ?? "Finding", CONTENT_WIDTH - 130);
      titleLines.forEach((line, idx) => {
        doc.text(line, MARGIN, y);
        if (idx === 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(f.status === "added" ? 0 : 110);
          doc.text(FINDING_STATUS_LABEL[f.status] ?? f.status, PAGE_WIDTH - MARGIN, y, { align: "right" });
          doc.setTextColor(0);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
        }
        y += 12;
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(SCOPE_STATUS_LABEL[f.scope_status] ?? f.scope_status ?? "", MARGIN, y);
      y += 11;
      doc.setTextColor(0);

      if (f.reason) {
        doc.setFontSize(9);
        const reasonLines = doc.splitTextToSize(`Why Vault flagged it: ${f.reason}`, CONTENT_WIDTH);
        ensureSpace(reasonLines.length * 12);
        for (const line of reasonLines) {
          doc.text(line, MARGIN, y);
          y += 12;
        }
      }

      if (item) {
        doc.setFontSize(8.5);
        doc.setTextColor(110);
        const rangeLine = `Typical range: ${formatRange(item.low_amount, item.high_amount, item.unit)}`;
        ensureSpace(12);
        doc.text(rangeLine, MARGIN, y);
        y += 12;
        doc.setTextColor(0);
      }
    }
  }

  // --- Disclaimer + page-number footer on every page ---------------------------
  const pageCount = doc.getNumberOfPages();
  const footerText = `${ANALYSIS_DISCLAIMER} ${VAULT_DISCLAIMER}`;
  const footerLines = doc.splitTextToSize(footerText, CONTENT_WIDTH);
  const footerLineHeight = 9.5;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    let fy = PAGE_HEIGHT - MARGIN + 10;
    for (const line of footerLines) {
      doc.text(line, MARGIN, fy);
      fy += footerLineHeight;
    }
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, fy, { align: "right" });
    doc.setTextColor(0);
  }

  return doc;
}
