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

export const DOOR_DEDUCTION_SF = 20;
export const WINDOW_DEDUCTION_SF = 15;

export function hasMeasurements(room) {
  return Number(room?.length_ft) > 0 && Number(room?.width_ft) > 0;
}

export function floorAreaSF(room) {
  if (!hasMeasurements(room)) return 0;
  return Number(room.length_ft) * Number(room.width_ft);
}

export function ceilingAreaSF(room) {
  // Same as floor area for a standard flat ceiling — a vaulted/cathedral
  // ceiling runs larger than this; adjust the filled-in quantity by hand.
  return floorAreaSF(room);
}

export function perimeterLF(room) {
  if (!hasMeasurements(room)) return 0;
  return 2 * (Number(room.length_ft) + Number(room.width_ft));
}

export function wallAreaSF(room) {
  if (!hasMeasurements(room)) return 0;
  const height = Number(room.ceiling_height_ft) > 0 ? Number(room.ceiling_height_ft) : 8;
  const gross = perimeterLF(room) * height;
  const deductions =
    Number(room.door_count || 0) * DOOR_DEDUCTION_SF +
    Number(room.window_count || 0) * WINDOW_DEDUCTION_SF;
  return Math.max(0, gross - deductions);
}
