// Pure math only — no fetching, no React.
//
// A sketched room is a rough-drawn polygon (click to place corners), where
// each wall carries its own typed real-world length, optional height
// override, openings (doors/windows/etc. with real width x height), a
// demo/replace flag, an optional flood-cut height, and notes — this is the
// "wall-by-wall" data a water-mitigation or reconstruction estimate needs.
//
// Floor/ceiling area used to be an approximation (the drawn shape scaled by
// one average pixel-to-foot ratio). It's now exact for a precisely-drawn
// shape: each wall's pixel DIRECTION is kept, but its length is replaced by
// the typed real-world length before running the shoelace formula — so a
// room drawn with right angles and accurate tape measurements comes out to
// the exact SF, not a rough scale-up.

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
// Unit-agnostic: works the same on raw pixel points or real-feet points.
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

// Rebuilds the room's shape in real feet: each wall keeps the DIRECTION it
// was drawn in, but its length becomes the typed real-world length instead
// of the pixel distance. A right-angle room typed accurately closes back on
// itself and gives an exact area; an imprecisely-drawn or genuinely
// non-square room gives a reasonable near-closed polygon either way.
export function reconstructRealPoints(pixelPoints, lengthsFt) {
  if (!pixelPoints || pixelPoints.length < 2) return [];
  const real = [{ x: 0, y: 0 }];
  for (let i = 0; i < pixelPoints.length; i++) {
    const a = pixelPoints[i];
    const b = pixelPoints[(i + 1) % pixelPoints.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const pxLen = Math.hypot(dx, dy);
    const lenFt = Number(lengthsFt[i]) || 0;
    const ux = pxLen > 0 ? dx / pxLen : 0;
    const uy = pxLen > 0 ? dy / pxLen : 0;
    if (i < pixelPoints.length - 1) {
      const prev = real[real.length - 1];
      real.push({ x: prev.x + ux * lenFt, y: prev.y + uy * lenFt });
    }
  }
  return real;
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
// height when the wall has no override of its own.
export function wallMeasurements(wall, roomHeightFt = 8) {
  const lengthFt = Number(wall?.lengthFt) || 0;
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

// points: the drawn corners (pixel space), one per wall start.
// walls: one entry per wall (same order/count as points), each
//   { lengthFt, heightFt, openings, demo, replace, floodCut, notes }.
export function computeSketchMeasurements({ points, walls, ceilingHeightFt = 8 }) {
  const safeWalls = walls || [];
  const lengthsFt = safeWalls.map((w) => Number(w.lengthFt) || 0);
  const perimeterLF = lengthsFt.reduce((sum, l) => sum + l, 0);

  const realPoints = reconstructRealPoints(points || [], lengthsFt);
  const floorAreaSF = polygonPixelArea(realPoints);
  const ceilingAreaSF = floorAreaSF;

  const height = Number(ceilingHeightFt) > 0 ? Number(ceilingHeightFt) : 8;
  const perWall = safeWalls.map((w) => wallMeasurements(w, height));

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

// Upgrades a sketch saved under the old shape (parallel wallLengths /
// doorWalls / windowWalls arrays, one fixed door/window deduction each) into
// the current per-wall walls[] shape, so a sketch saved before this engine
// upgrade still opens and measures sensibly instead of breaking.
export function upgradeLegacySketchData(sketchData) {
  if (!sketchData) return sketchData;
  if (Array.isArray(sketchData.walls)) return sketchData; // already current

  const points = sketchData.points || [];
  const wallLengths = sketchData.wallLengths || points.map(() => "");
  const doorSet = new Set(sketchData.doorWalls || []);
  const windowSet = new Set(sketchData.windowWalls || []);

  const walls = wallLengths.map((len, i) => {
    const openings = [];
    if (doorSet.has(i)) openings.push(newOpening("door"));
    if (windowSet.has(i)) openings.push(newOpening("window"));
    return {
      lengthFt: parseFeetInches(len) || 0,
      lengthInput: len,
      heightFt: null,
      openings,
      demo: false,
      replace: false,
      floodCut: null,
      notes: "",
    };
  });

  return { points, walls };
}
