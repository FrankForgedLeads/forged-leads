// Pure math only — no fetching, no React.
//
// A sketched room is a rough-drawn polygon (click to place corners) where
// each wall gets a typed real-world length — same idea as a contractor's
// pen-and-paper floor plan, just turned into numbers automatically.
//
// Only the TYPED lengths are used for perimeter and wall area, so those are
// exact. Floor/ceiling area comes from the drawn shape's proportions scaled
// by the typed lengths (average pixel-to-foot scale across all walls), so
// it's a close approximation, not a surveyed measurement — good enough to
// save the contractor from doing the math by hand, not good enough to skip
// a real tape measure on a tight job.

import { DOOR_DEDUCTION_SF, WINDOW_DEDUCTION_SF } from "./measurements.js";

// Accepts "7'9\"", "7' 9", "7ft 9in", "7.75", "93\"", "7" -> decimal feet.
// Returns null if it can't make sense of the input.
export function parseFeetInches(input) {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (s === "") return null;

  // Pure inches, e.g. 93" or 93in
  const inchesOnly = s.match(/^(\d+(?:\.\d+)?)\s*(?:"|in)$/i);
  if (inchesOnly) return Number(inchesOnly[1]) / 12;

  // feet + inches, e.g. 7'9", 7' 9", 7ft 9in, 7ft9
  const feetInches = s.match(
    /^(\d+(?:\.\d+)?)\s*(?:'|ft)\s*(\d+(?:\.\d+)?)?\s*(?:"|in)?$/i
  );
  if (feetInches) {
    const feet = Number(feetInches[1]);
    const inches = feetInches[2] ? Number(feetInches[2]) : 0;
    return feet + inches / 12;
  }

  // Plain number, e.g. 7.75 or 7 -> feet
  const plain = s.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) return Number(plain[1]);

  return null;
}

export function formatFeetInches(feet) {
  if (!(Number(feet) > 0)) return "";
  const totalInches = Math.round(Number(feet) * 12);
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return inches === 0 ? `${ft}'` : `${ft}'${inches}"`;
}

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Shoelace formula — signed area of a closed polygon from its vertices.
export function polygonPixelArea(points) {
  if (!points || points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function pixelWallLengths(points) {
  if (!points || points.length < 2) return [];
  return points.map((p, i) => dist(p, points[(i + 1) % points.length]));
}

// wallLengths: real feet per wall, same order/count as points (segment i
// runs from points[i] to points[i+1]). doorWalls/windowWalls: Sets (or
// arrays) of wall indices flagged as having a door/window on that wall.
export function computeSketchMeasurements({
  points,
  wallLengths,
  doorWalls = [],
  windowWalls = [],
  ceilingHeightFt = 8,
}) {
  const lengths = (wallLengths || []).map((l) => Number(l) || 0);
  const perimeterLF = lengths.reduce((sum, l) => sum + l, 0);

  const pixelLengths = pixelWallLengths(points);
  const pixelPerimeter = pixelLengths.reduce((sum, l) => sum + l, 0);
  const scale = pixelPerimeter > 0 ? perimeterLF / pixelPerimeter : 0;

  const pixelArea = polygonPixelArea(points);
  const floorAreaSF = pixelArea * scale * scale;
  const ceilingAreaSF = floorAreaSF;

  const height = Number(ceilingHeightFt) > 0 ? Number(ceilingHeightFt) : 8;
  const doorSet = new Set(doorWalls);
  const windowSet = new Set(windowWalls);
  const deductions = lengths.reduce((sum, _l, i) => {
    let d = 0;
    if (doorSet.has(i)) d += DOOR_DEDUCTION_SF;
    if (windowSet.has(i)) d += WINDOW_DEDUCTION_SF;
    return sum + d;
  }, 0);
  const wallAreaSF = Math.max(0, perimeterLF * height - deductions);

  return {
    floorAreaSF: Math.round(floorAreaSF * 10) / 10,
    ceilingAreaSF: Math.round(ceilingAreaSF * 10) / 10,
    wallAreaSF: Math.round(wallAreaSF * 10) / 10,
    perimeterLF: Math.round(perimeterLF * 10) / 10,
  };
}
