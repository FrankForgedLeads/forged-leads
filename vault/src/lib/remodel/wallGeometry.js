// Phase 1 of the vertex/wall floor-plan rewrite — pure polygon math only.
//
// Coordinates are in INCHES, the model's real source of truth (never
// screen pixels, never feet directly) per the engine's measurement rule.
// This intentionally does NOT yet handle openings (doors/windows/missing
// walls) — that stays on the existing room-based model until a later
// phase moves openings onto walls instead of rooms. The only job here is:
// given a room's ordered loop of wall segments, compute the same geometry
// numbers floorplanGeometry.js already produces for a plain rectangle, so
// the two can be proven equivalent before anything in the UI switches
// over to real vertices/walls.

export const IN_PER_FT = 12;

export function sqInToSqFt(sqIn) {
  return sqIn / (IN_PER_FT * IN_PER_FT);
}

export function inToFt(inches) {
  return inches / IN_PER_FT;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Shoelace formula — works for any simple closed polygon, not just
// rectangles, so this generalizes past today's rectangle-only rooms.
export function polygonAreaSqIn(points) {
  const n = points.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function polygonPerimeterIn(points) {
  const n = points.length;
  if (n < 2) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}

// `points`: ordered closed-loop vertices in inches, e.g. [{x,y}, ...].
// `wallHeightsIn`: one height per edge (wall i runs points[i] -> points[i+1]
// wrapping around); a single number applies that height to every wall.
export function computeRoomGeometryFromWalls({ points, wallHeightsIn }) {
  const n = points.length;
  const heights = Array.isArray(wallHeightsIn)
    ? wallHeightsIn
    : new Array(n).fill(Number(wallHeightsIn) || 96);

  const floorAreaSF = sqInToSqFt(polygonAreaSqIn(points));
  const perimeterLF = inToFt(polygonPerimeterIn(points));

  let wallGrossAreaSF = 0;
  const walls = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const lengthFt = inToFt(Math.hypot(b.x - a.x, b.y - a.y));
    const heightFt = inToFt(heights[i] ?? heights[0]);
    const grossSF = lengthFt * heightFt;
    wallGrossAreaSF += grossSF;
    walls.push({
      index: i,
      lengthFt: round2(lengthFt),
      heightFt: round2(heightFt),
      grossSF: round2(grossSF),
    });
  }

  const avgHeightFt = heights.reduce((sum, h) => sum + inToFt(h), 0) / (heights.length || 1);
  const roomVolumeCF = floorAreaSF * avgHeightFt;

  return {
    floorAreaSF: round2(floorAreaSF),
    ceilingAreaSF: round2(floorAreaSF),
    perimeterLF: round2(perimeterLF),
    wallGrossAreaSF: round2(wallGrossAreaSF),
    roomVolumeCF: round2(roomVolumeCF),
    walls,
  };
}

// Builds the ordered inches-polygon for a plain rectangle room, exactly
// the shape the Phase 1 SQL backfill generates (NW -> NE -> SE -> SW),
// from the same width/length/position a room uses today. Used only to
// prove parity with the rectangle math in floorplanGeometry.js — real
// rooms will eventually come from actual remodel_vertices/remodel_walls
// rows instead of this helper.
export function rectangleRoomToWallLoop({ xFt = 0, yFt = 0, widthFt, lengthFt, ceilingHeightFt = 8 }) {
  const x0 = xFt * IN_PER_FT;
  const y0 = yFt * IN_PER_FT;
  const x1 = x0 + widthFt * IN_PER_FT;
  const y1 = y0 + lengthFt * IN_PER_FT;
  const points = [
    { x: x0, y: y0 }, // NW
    { x: x1, y: y0 }, // NE
    { x: x1, y: y1 }, // SE
    { x: x0, y: y1 }, // SW
  ];
  return { points, wallHeightsIn: ceilingHeightFt * IN_PER_FT };
}
