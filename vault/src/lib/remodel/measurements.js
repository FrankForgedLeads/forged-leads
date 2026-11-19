// Pure math only — no fetching, no React.
//
// A room's length/width/ceiling height and door/window counts turn into the
// SF/LF numbers a contractor would otherwise multiply by hand: floor area,
// wall area (for paint), ceiling area, and perimeter (for baseboard/trim).
//
// Door/window deductions use typical opening sizes (door ~3'x6'8" = 20 SF,
// window ~3'x5' = 15 SF) since most estimates don't need exact per-opening
// dimensions — adjust the quantity by hand after filling it in if a room's
// openings are unusually large or small.
//
// A room measured with the sketch tool (lib/remodel/sketch.js) stores its
// result directly on sketch_floor_area_sf/sketch_wall_area_sf/etc. — those
// take priority over the simple length/width fields below, since a sketched
// room isn't necessarily a plain rectangle.
//
// A room placed on the floor plan (lib/remodel/floorplanGeometry.js) has
// real per-wall openings in remodel_room_openings instead of just a door/
// window count — when those are loaded on the room, they win over the
// generic door/window SF guesses below, so this page and the floor plan
// page always agree on the same room's numbers.

import { computeRoomGeometry } from "./floorplanGeometry.js";

export const DOOR_DEDUCTION_SF = 20;
export const WINDOW_DEDUCTION_SF = 15;

export function hasSketch(room) {
  return Number(room?.sketch_perimeter_lf) > 0;
}

function hasRealOpenings(room) {
  return Array.isArray(room?.remodel_room_openings) && room.remodel_room_openings.length > 0;
}

// True once a room has been placed on the Floor Plan canvas (has a
// position there), regardless of whether it has any doors/windows yet —
// floor area/perimeter are already real geometry at that point, so the
// legacy per-room sketch tool and the simple door/window-count fields
// become redundant (and can disagree with the floor plan) once this is
// true, unless the room also still has an actual legacy sketch.
export function isOnFloorPlan(room) {
  return room?.floorplan_x != null && room?.floorplan_y != null;
}

function floorplanGeometryFor(room) {
  return computeRoomGeometry({
    widthFt: room.width_ft,
    lengthFt: room.length_ft,
    ceilingHeightFt: room.ceiling_height_ft,
    openings: room.remodel_room_openings,
  });
}

export function hasMeasurements(room) {
  return hasSketch(room) || (Number(room?.length_ft) > 0 && Number(room?.width_ft) > 0);
}

export function floorAreaSF(room) {
  if (hasSketch(room)) return Number(room.sketch_floor_area_sf) || 0;
  if (!hasMeasurements(room)) return 0;
  return Number(room.length_ft) * Number(room.width_ft);
}

export function ceilingAreaSF(room) {
  if (hasSketch(room)) return Number(room.sketch_ceiling_area_sf) || 0;
  // Same as floor area for a standard flat ceiling — a vaulted/cathedral
  // ceiling runs larger than this; adjust the filled-in quantity by hand.
  return floorAreaSF(room);
}

export function perimeterLF(room) {
  if (hasSketch(room)) return Number(room.sketch_perimeter_lf) || 0;
  if (!hasMeasurements(room)) return 0;
  return 2 * (Number(room.length_ft) + Number(room.width_ft));
}

// "Wall area" means NET wall SF everywhere this has always been used
// (paint/drywall quick-fill, macros) — kept as-is for backward compatibility.
export function wallAreaSF(room) {
  if (hasSketch(room)) return Number(room.sketch_wall_area_sf) || 0;
  if (hasRealOpenings(room)) return floorplanGeometryFor(room).wallAreaSF;
  if (!hasMeasurements(room)) return 0;
  const height = Number(room.ceiling_height_ft) > 0 ? Number(room.ceiling_height_ft) : 8;
  const gross = perimeterLF(room) * height;
  const deductions =
    Number(room.door_count || 0) * DOOR_DEDUCTION_SF +
    Number(room.window_count || 0) * WINDOW_DEDUCTION_SF;
  return Math.max(0, gross - deductions);
}

// Gross wall SF — before any door/window deduction. A sketched or
// floor-plan room with real openings stores/computes this directly; a
// simple length/width room has no real openings on file, so gross and net
// are the same there.
export function wallGrossAreaSF(room) {
  if (hasSketch(room)) return Number(room.sketch_wall_gross_area_sf) || 0;
  if (hasRealOpenings(room)) return floorplanGeometryFor(room).wallGrossAreaSF;
  if (!hasMeasurements(room)) return 0;
  const height = Number(room.ceiling_height_ft) > 0 ? Number(room.ceiling_height_ft) : 8;
  return perimeterLF(room) * height;
}

// Baseboard doesn't run through a doorway — a sketched or floor-plan room
// nets out each wall's real door-width openings exactly; a simple-entry
// room just assumes each counted door is a typical 3 ft wide opening.
export function baseboardLF(room) {
  if (hasSketch(room)) return Number(room.sketch_baseboard_lf) || 0;
  if (hasRealOpenings(room)) return floorplanGeometryFor(room).baseboardLF;
  if (!hasMeasurements(room)) return 0;
  const TYPICAL_DOOR_WIDTH_FT = 3;
  return Math.max(0, perimeterLF(room) - Number(room.door_count || 0) * TYPICAL_DOOR_WIDTH_FT);
}

export function roomVolumeCF(room) {
  if (hasSketch(room)) return Number(room.sketch_room_volume_cf) || 0;
  if (!hasMeasurements(room)) return 0;
  const height = Number(room.ceiling_height_ft) > 0 ? Number(room.ceiling_height_ft) : 8;
  return floorAreaSF(room) * height;
}
