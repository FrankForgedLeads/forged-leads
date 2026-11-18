// Pure math only — no fetching, no React.
//
// The floor-plan object model: a room is a plain rectangle (widthFt x
// lengthFt x ceilingHeightFt) placed on a shared canvas. Its four walls are
// implicit — North/South run the room's WIDTH, East/West run its LENGTH —
// so every number here is exact from typed dimensions alone; there's no
// drawing to approximate, unlike the freehand sketch tool.
//
// Openings attach to a named wall side plus how far along it (not raw
// canvas coordinates), so moving or resizing a room keeps its doors and
// windows attached and their math correct. Fields match the
// remodel_room_openings table's column names (wall_side, offset_ft,
// width_ft, height_ft, qty, starts_at_floor) so a row fetched from
// Supabase can be used here directly, with no mapping step.

export const WALL_SIDES = ["N", "E", "S", "W"];

// Our own opening types for the floor plan — independent naming, not any
// third-party product's catalog. startsAtFloor decides whether an
// opening's width is exempt from that wall's baseboard LF (a doorway has
// no baseboard; a window usually does).
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

export function defaultOpeningFor(type = "door") {
  const def = OPENING_TYPES[type] || OPENING_TYPES.custom;
  return {
    type,
    width_ft: def.defaultWidthFt,
    height_ft: def.defaultHeightFt,
    qty: 1,
    starts_at_floor: def.startsAtFloor,
    description: "",
  };
}

export function wallSideLengthFt(wallSide, widthFt, lengthFt) {
  return wallSide === "N" || wallSide === "S" ? Number(widthFt) || 0 : Number(lengthFt) || 0;
}

export function openingAreaSF(opening) {
  return (
    (Number(opening?.width_ft) || 0) * (Number(opening?.height_ft) || 0) * (Number(opening?.qty) || 1)
  );
}

function openingsOnSide(openings, side) {
  return (openings || []).filter((o) => o.wall_side === side);
}

export function wallMeasurements(side, widthFt, lengthFt, heightFt, openings) {
  const lenFt = wallSideLengthFt(side, widthFt, lengthFt);
  const sideOpenings = openingsOnSide(openings, side);
  const grossSF = lenFt * (Number(heightFt) > 0 ? Number(heightFt) : 8);
  const openingsSF = sideOpenings.reduce((sum, o) => sum + openingAreaSF(o), 0);
  const netSF = Math.max(0, grossSF - openingsSF);
  const floorOpeningsWidthFt = sideOpenings.reduce(
    (sum, o) => (o.starts_at_floor ? sum + (Number(o.width_ft) || 0) * (Number(o.qty) || 1) : sum),
    0,
  );
  const baseboardLF = Math.max(0, lenFt - floorOpeningsWidthFt);
  return { side, lengthFt: lenFt, grossSF, openingsSF, netSF, baseboardLF, openings: sideOpenings };
}

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

export function computeRoomGeometry({ widthFt, lengthFt, ceilingHeightFt = 8, openings = [] }) {
  const w = Number(widthFt) || 0;
  const l = Number(lengthFt) || 0;
  const h = Number(ceilingHeightFt) > 0 ? Number(ceilingHeightFt) : 8;

  const floorAreaSF = w * l;
  const ceilingAreaSF = floorAreaSF;
  const perimeterLF = 2 * (w + l);

  const walls = WALL_SIDES.map((side) => wallMeasurements(side, w, l, h, openings));
  const wallGrossAreaSF = walls.reduce((sum, wall) => sum + wall.grossSF, 0);
  const wallNetAreaSF = walls.reduce((sum, wall) => sum + wall.netSF, 0);
  const baseboardLF = walls.reduce((sum, wall) => sum + wall.baseboardLF, 0);
  const openingsSF = walls.reduce((sum, wall) => sum + wall.openingsSF, 0);
  // Crown runs the full ceiling perimeter — no vaulted/stepped-ceiling
  // modeling yet, so this is the same number as the perimeter.
  const crownMoldingLF = perimeterLF;
  const roomVolumeCF = floorAreaSF * h;

  return {
    floorAreaSF: round1(floorAreaSF),
    ceilingAreaSF: round1(ceilingAreaSF),
    perimeterLF: round1(perimeterLF),
    wallGrossAreaSF: round1(wallGrossAreaSF),
    wallNetAreaSF: round1(wallNetAreaSF),
    wallAreaSF: round1(wallNetAreaSF), // "net" — matches the convention used everywhere else in Remodel
    baseboardLF: round1(baseboardLF),
    crownMoldingLF: round1(crownMoldingLF),
    roomVolumeCF: round1(roomVolumeCF),
    openingsSF: round1(openingsSF),
    walls: walls.map((wall) => ({
      side: wall.side,
      lengthFt: round1(wall.lengthFt),
      grossSF: round1(wall.grossSF),
      openingsSF: round1(wall.openingsSF),
      netSF: round1(wall.netSF),
      baseboardLF: round1(wall.baseboardLF),
    })),
  };
}

// Fits the closest rectangle to a room's previously-measured floor area and
// perimeter (from the old freehand sketch tool) so an already-sketched room
// drops onto the new floor plan as a normal rectangle, ready to edit with
// the new tools — solves width+length = perimeter/2 and width*length =
// area as a quadratic; falls back to a square when the old shape was too
// irregular for any real rectangle to match both numbers at once.
export function fitRectangleToAreaAndPerimeter(areaSF, perimeterLF) {
  const s = (Number(perimeterLF) || 0) / 2; // width + length
  const p = Number(areaSF) || 0; // width * length
  if (s <= 0 || p <= 0) return null;
  const discriminant = s * s - 4 * p;
  if (discriminant < 0) {
    const side = Math.sqrt(p);
    return { widthFt: round1(side), lengthFt: round1(side) };
  }
  const root = Math.sqrt(discriminant);
  const a = (s + root) / 2;
  const b = (s - root) / 2;
  return { widthFt: round1(Math.max(a, b)), lengthFt: round1(Math.min(a, b)) };
}
