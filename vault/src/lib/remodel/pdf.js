import { formatCurrency } from "../format.js";
import { getLogoSignedUrl } from "../api/profile.js";
import { VAULT_DISCLAIMER } from "../disclaimer.js";
import { lineTotal, roomTotal, computeEstimateTotals } from "./totals.js";

const MARGIN = 54; // 0.75in
const PAGE_WIDTH = 612; // US Letter, pt
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_RESERVE = 46;
const LOGO_MAX_WIDTH = 120; // pt — keeps it a header mark, not the page
const LOGO_MAX_HEIGHT = 54;

// Turns the user's stored logo into pixel data jsPDF can embed, same
// signed-URL-> <img> -> canvas re-encode technique as letters/photoEmbed.js.
// Returns null on any failure (no logo set, revoked URL, a format the
// browser can't decode) — a missing logo must never block the export.
async function loadEmbeddableLogo(logoPath) {
  if (!logoPath) return null;
  try {
    const url = await getLogoSignedUrl(logoPath);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not load logo"));
      el.src = url;
    });

    const scale = Math.min(1, LOGO_MAX_WIDTH / img.naturalWidth, LOGO_MAX_HEIGHT / img.naturalHeight);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);

    return { dataUrl: canvas.toDataURL("image/png"), width, height };
  } catch {
    return null;
  }
}

/**
 * Builds the Remodel estimate PDF and returns the jsPDF document. Caller
 * decides whether to .save() or pull a blob for something else.
 *
 * profile: the signed-in user's profiles row (full_name, company, phone,
 * email, logo_path) — the "who this estimate is from" block.
 * estimate: a remodel_estimates row (title, client_name, property_address,
 * overhead_pct, profit_pct, tax_pct).
 * rooms: remodel_rooms rows, each with its nested remodel_room_items —
 * exactly what fetchRemodelRooms() returns.
 */
export async function generateRemodelEstimatePdf({ profile, estimate, rooms }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const logo = await loadEmbeddableLogo(profile?.logo_path);
  let y = MARGIN;

  function ensureSpace(needed) {
    if (y + needed > PAGE_HEIGHT - FOOTER_RESERVE) {
      doc.addPage();
      y = MARGIN;
    }
  }

  // --- Header: logo (if any) + company block (left), date (right) --------
  const headerLeft = logo ? MARGIN + logo.width + 14 : MARGIN;
  if (logo) {
    doc.addImage(logo.dataUrl, "PNG", MARGIN, y, logo.width, logo.height);
  }

  const headerTop = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(profile?.company || profile?.full_name || "Your Company", headerLeft, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    PAGE_WIDTH - MARGIN,
    y + 12,
    { align: "right" },
  );

  let contactY = y + 28;
  const contactLines = [profile?.full_name, profile?.phone, profile?.email].filter(Boolean);
  doc.setFontSize(10);
  for (const line of contactLines) {
    doc.text(line, headerLeft, contactY);
    contactY += 13;
  }

  y = Math.max(contactY, headerTop + (logo?.height || 0) + 14);

  // --- Estimate title + client/property block -----------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  y += 10;
  doc.text(estimate.title || "Untitled estimate", MARGIN, y);
  y += 20;

  const clientLines = [
    estimate.client_name ? `Client: ${estimate.client_name}` : null,
    estimate.property_address ? `Property: ${estimate.property_address}` : null,
  ].filter(Boolean);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  for (const line of clientLines) {
    doc.text(line, MARGIN, y);
    y += 15;
  }

  // --- Rooms ---------------------------------------------------------------
  for (const room of rooms) {
    const items = room.remodel_room_items || [];
    if (items.length === 0) continue;

    ensureSpace(26);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setDrawColor(200);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 16;
    doc.text(room.name || "Untitled room", MARGIN, y);
    y += 14;

    for (const item of items) {
      const titleLines = doc.splitTextToSize(item.description, CONTENT_WIDTH - 80);
      const amountStr = formatCurrency(lineTotal(item));

      ensureSpace(titleLines.length * 13 + 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      titleLines.forEach((line, idx) => {
        doc.text(line, MARGIN + 6, y);
        if (idx === 0) doc.text(amountStr, PAGE_WIDTH - MARGIN, y, { align: "right" });
        y += 13;
      });

      doc.setFontSize(9);
      doc.setTextColor(110);
      const detail = `${item.quantity} ${item.unit} × ${formatCurrency(item.unit_price)}/${item.unit}${item.note ? ` — ${item.note}` : ""}`;
      const detailLines = doc.splitTextToSize(detail, CONTENT_WIDTH - 20);
      ensureSpace(detailLines.length * 12);
      for (const line of detailLines) {
        doc.text(line, MARGIN + 12, y);
        y += 12;
      }
      doc.setTextColor(0);
      y += 4;
    }

    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`${room.name || "Room"} subtotal`, MARGIN + 6, y);
    doc.text(formatCurrency(roomTotal(room)), PAGE_WIDTH - MARGIN, y, { align: "right" });
    y += 10;
  }

  // --- Totals ----------------------------------------------------------------
  const totals = computeEstimateTotals(rooms, {
    overheadPct: estimate.overhead_pct,
    profitPct: estimate.profit_pct,
    taxPct: estimate.tax_pct,
  });

  ensureSpace(100);
  y += 18;
  doc.setDrawColor(200);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 18;

  function totalLine(label, amount, { bold = false, size = 10.5 } = {}) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(label, MARGIN, y);
    doc.text(formatCurrency(amount), PAGE_WIDTH - MARGIN, y, { align: "right" });
    y += bold ? 18 : 15;
  }

  totalLine("Subtotal", totals.subtotal);
  if (Number(estimate.overhead_pct) > 0) {
    totalLine(`Overhead (${estimate.overhead_pct}%)`, totals.overheadAmount);
  }
  if (Number(estimate.profit_pct) > 0) {
    totalLine(`Profit (${estimate.profit_pct}%)`, totals.profitAmount);
  }
  if (Number(estimate.tax_pct) > 0) {
    totalLine(`Tax (${estimate.tax_pct}%)`, totals.taxAmount);
  }
  totalLine("Total", totals.grandTotal, { bold: true, size: 13 });

  // --- Disclaimer footer on every page -------------------------------------
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
