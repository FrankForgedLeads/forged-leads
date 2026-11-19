// Pure math only — no fetching, no React.
//
// A sketched room is drawn on a fixed-scale grid — like graph paper, same
// idea as Xactimate's sketch canvas: one grid square equals a real number
// of feet (DEFAULT_PIXELS_PER_FOOT px = 1 ft by default, adjustable per
// sketch). Because every point on the canvas already sits at a known
// real-world position, every length, area, and perimeter is exact and
// LIVE the moment you draw or drag — there's no separate "now type the
// real length" step and no approximation to reconcile against the drawing.
//
// Typing an exact number into a wall's length box still works — it snaps
// that wall's far corner to exactly that distance, along whatever
// direction it's currently drawn in (lib/remodel/sketch.js's
// snapPointToExactLength) — the same "draw it roughly, then dial in the
// precise number" flow Xactimate's dimension entry gives you.
//
// Each wall ALSO carries its own non-geometric data: a height override,
// real-dimension openings (doors/windows/etc.), a demo/replace flag, an
// optional flood-cut height, and notes — the "wall-by-wall" detail a
// water-mitigation or reconstruction estimate needs.

export const GRID_PX = 20; // the background grid's cell size, in canvas px
export const DEFAULT_PIXELS_PER_FOOT = GRID_PX; // 1 grid square = 1 ft by default

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

// Wall i runs from points[i] to points[(i+1) % points.length].
export function wallLengthFt(points, wallIndex, pixelsPerFoot) {
  if (!points || points.length < 2 || !pixelsPerFoot) return 0;
  const a = points[wallIndex];
  const b = points[(wallIndex + 1) % points.length];
  if (!a || !b) return 0;
  return dist(a, b) / pixelsPerFoot;
}

// Moves wall i's FAR corner (points[(i+1) % length]) so the wall becomes
// exactly exactFt long, keeping the direction it's currently drawn in and
// keeping the NEAR corner (points[i]) fixed — the "type the real number"
// precision fix for a roughly-drawn wall.
export function snapPointToExactLength(points, wallIndex, exactFt, pixelsPerFoot) {
  if (!points || points.length < 2) return points;
  const n = points.length;
  const a = points[wallIndex];
  const bIndex = (wallIndex + 1) % n;
  const b = points[bIndex];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const pxLen = Math.hypot(dx, dy);
  const ux = pxLen > 0 ? dx / pxLen : 1;
  const uy = pxLen > 0 ? dy / pxLen : 0;
  const targetPx = exactFt * pixelsPerFoot;
  const next = [...points];
  next[bIndex] = { x: a.x + ux * targetPx, y: a.y + uy * targetPx };
  return next;
}

// Generic opening types for the wall editor — our own naming, not any
// third-party product's catalog. startsAtFloor decides whether an opening's
// width is exempt from baseboard LF and a flood cut (a doorway has no wall,
// and usually no baseboard, down at the floor; a window usually does).
export const OPENING_TYPES = {
  door: { label: "Door", defaultWidthFt: 3, defaultHeightFt: 7, startsAtFloor: true },
  double_door: { label: "Double door", defaultWidthFt: 6, defaultHeightFt: 7, startsAtFloor: true },
  sliding_glass_door: {
    label: "Sliding glass door",
    defaultWidthFt: 6,
    defaultHeightFt: 7,
    startsAtFloor: true,
  },
  exterior_door: { label: "Exterior door", defaultWidthFt: 3, defaultHeightFt: 7, startsAtFloor: true },
  window: { label: "Window", defaultWidthFt: 3, defaultHeightFt: 4, startsAtFloor: false },
  large_opening: { label: "Large opening", defaultWidthFt: 6, defaultHeightFt: 8, startsAtFloor: true },
  pass_through: { label: "Pass-through", defaultWidthFt: 3, defaultHeightFt: 3, startsAtFloor: false },
  custom: { label: "Custom opening", defaultWidthFt: 3, defaultHeightFt: 3, startsAtFloor: true },
};

export function newOpening(type = "door") {
  const def = OPENING_TYPES[type] || OPENING_TYPES.custom;
  return {
    type,
    widthFt: def.defaultWidthFt,
    heightFt: def.defaultHeightFt,
    qty: 1,
    startsAtFloor: def.startsAtFloor,
    description: "",
  };
}

export function openingAreaSF(opening) {
  return (
    (Number(opening?.widthFt) || 0) * (Number(opening?.heightFt) || 0) * (Number(opening?.qty) || 1)
  );
}

export function wallOpeningsSF(wall) {
  return (wall?.openings || []).reduce((sum, o) => sum + openingAreaSF(o), 0);
}

// Total width of this wall's floor-starting openings (doors, etc.) — the
// portion with no baseboard and no flood-cut wall below the cut line.
function floorOpeningsWidthFt(wall) {
  return (wall?.openings || []).reduce(
    (sum, o) => (o.startsAtFloor ? sum + (Number(o.widthFt) || 0) * (Number(o.qty) || 1) : sum),
    0,
  );
}

// Per-wall measurements: gross/net SF, baseboard LF, and flood-cut SF if
// that wall has one enabled. heightFt falls back to the room's ceiling
// height when the wall has no override of its own. lengthFt is passed in
// explicitly — it comes from the drawing's scale, not stored on the wall.
export function wallMeasurements(wall, lengthFt, roomHeightFt = 8) {
  const heightFt = Number(wall?.heightFt) > 0 ? Number(wall.heightFt) : Number(roomHeightFt) || 8;
  const grossSF = lengthFt * heightFt;
  const openingsSF = wallOpeningsSF(wall);
  const netSF = Math.max(0, grossSF - openingsSF);
  const baseboardLF = Math.max(0, lengthFt - floorOpeningsWidthFt(wall));

  let floodCutSF = 0;
  if (wall?.floodCut?.enabled) {
    const cutHeightFt = Number(wall.floodCut.heightFt) || 0;
    const exemptWidthFt = Math.min(lengthFt, floorOpeningsWidthFt(wall));
    floodCutSF = Math.max(0, (lengthFt - exemptWidthFt) * cutHeightFt);
  }

  return { lengthFt, heightFt, grossSF, openingsSF, netSF, baseboardLF, floodCutSF };
}

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// points: the drawn corners, already at real scale (pixelsPerFoot px = 1 ft).
// walls: one entry per wall (same order/count as points), each
//   { heightFt, openings, demo, replace, floodCut, notes } — no lengthFt;
//   that's always read live from points + pixelsPerFoot.
export function computeSketchMeasurements({
  points,
  walls,
  pixelsPerFoot = DEFAULT_PIXELS_PER_FOOT,
  ceilingHeightFt = 8,
}) {
  const safePoints = points || [];
  const safeWalls = walls || [];
  const lengthsFt = safePoints.map((_, i) => wallLengthFt(safePoints, i, pixelsPerFoot));
  const perimeterLF = lengthsFt.reduce((sum, l) => sum + l, 0);

  const floorAreaSF = polygonPixelArea(safePoints) / (pixelsPerFoot * pixelsPerFoot);
  const ceilingAreaSF = floorAreaSF;

  const height = Number(ceilingHeightFt) > 0 ? Number(ceilingHeightFt) : 8;
  const perWall = safeWalls.map((w, i) => wallMeasurements(w, lengthsFt[i] || 0, height));

  const wallGrossAreaSF = perWall.reduce((sum, w) => sum + w.grossSF, 0);
  const wallNetAreaSF = perWall.reduce((sum, w) => sum + w.netSF, 0);
  const baseboardLF = perWall.reduce((sum, w) => sum + w.baseboardLF, 0);
  // Crown runs the full ceiling perimeter — no vaulted/stepped-ceiling
  // modeling yet, so this is the same number as the perimeter.
  const crownMoldingLF = perimeterLF;
  const avgWallHeight = perWall.length
    ? perWall.reduce((sum, w) => sum + w.heightFt, 0) / perWall.length
    : height;
  const roomVolumeCF = floorAreaSF * avgWallHeight;

  return {
    floorAreaSF: round1(floorAreaSF),
    ceilingAreaSF: round1(ceilingAreaSF),
    perimeterLF: round1(perimeterLF),
    // "wallAreaSF" has always meant NET here (paint/drywall quick-fill,
    // macros) — kept so every existing caller keeps working unchanged.
    wallAreaSF: round1(wallNetAreaSF),
    wallNetAreaSF: round1(wallNetAreaSF),
    wallGrossAreaSF: round1(wallGrossAreaSF),
    baseboardLF: round1(baseboardLF),
    crownMoldingLF: round1(crownMoldingLF),
    roomVolumeCF: round1(roomVolumeCF),
    walls: perWall.map((w) => ({
      lengthFt: round1(w.lengthFt),
      heightFt: round1(w.heightFt),
      grossSF: round1(w.grossSF),
      openingsSF: round1(w.openingsSF),
      netSF: round1(w.netSF),
      baseboardLF: round1(w.baseboardLF),
      floodCutSF: round1(w.floodCutSF),
    })),
  };
}

// Brings a sketch saved under any earlier shape forward to the current one
// ({ points, pixelsPerFoot, walls }, walls holding only non-geometric data)
// without visibly moving the drawing: a sketch saved before the
// fixed-scale engine fits a pixelsPerFoot from its own typed lengths vs.
// its drawn pixel perimeter (the same approximation the old engine used,
// just applied once at upgrade time instead of on every calculation), so
// the shape you see on reopen looks the same as when you saved it; nothing
// is lost, and you can true it up further with a drag or a typed length.
export function upgradeLegacySketchData(sketchData) {
  if (!sketchData) return sketchData;
  if (sketchData.pixelsPerFoot && Array.isArray(sketchData.walls)) {
    return sketchData; // already current
  }

  const points = sketchData.points || [];

  // Oldest shape: parallel wallLengths/doorWalls/windowWalls arrays.
  if (!Array.isArray(sketchData.walls)) {
    const wallLengths = sketchData.wallLengths || points.map(() => "");
    const doorSet = new Set(sketchData.doorWalls || []);
    const windowSet = new Set(sketchData.windowWalls || []);
    const typedLengthsFt = wallLengths.map((len) => parseFeetInches(len) || 0);
    const pixelsPerFoot = fitPixelsPerFoot(points, typedLengthsFt);
    const walls = wallLengths.map((_len, i) => {
      const openings = [];
      if (doorSet.has(i)) openings.push(newOpening("door"));
      if (windowSet.has(i)) openings.push(newOpening("window"));
      return { heightFt: null, openings, demo: false, replace: false, floodCut: null, notes: "" };
    });
    return { points, pixelsPerFoot, walls };
  }

  // Mid shape (the brief wall-by-wall release before the fixed-scale
  // rework): walls[i].lengthFt was typed directly, no shared scale yet.
  const typedLengthsFt = sketchData.walls.map((w) => Number(w.lengthFt) || 0);
  const pixelsPerFoot = fitPixelsPerFoot(points, typedLengthsFt);
  const walls = sketchData.walls.map((w) => ({
    heightFt: w.heightFt ?? null,
    openings: w.openings || [],
    demo: !!w.demo,
    replace: !!w.replace,
    floodCut: w.floodCut || null,
    notes: w.notes || "",
  }));
  return { points, pixelsPerFoot, walls };
}

function fitPixelsPerFoot(points, typedLengthsFt) {
  const pixelPerimeter = pixelWallLengths(points).reduce((sum, l) => sum + l, 0);
  const typedPerimeter = typedLengthsFt.reduce((sum, l) => sum + l, 0);
  if (typedPerimeter > 0 && pixelPerimeter > 0) return pixelPerimeter / typedPerimeter;
  return DEFAULT_PIXELS_PER_FOOT;
}
