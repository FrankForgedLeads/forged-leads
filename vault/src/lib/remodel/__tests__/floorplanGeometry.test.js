import { describe, it, expect } from "vitest";
import {
  wallSideLengthFt,
  openingAreaSF,
  wallMeasurements,
  computeRoomGeometry,
  fitRectangleToAreaAndPerimeter,
  defaultOpeningFor,
  buildRoomHierarchy,
  OPENING_TYPES,
} from "../floorplanGeometry.js";

describe("wallSideLengthFt", () => {
  it("N/S walls run the room's width; E/W walls run its length", () => {
    expect(wallSideLengthFt("N", 12, 10)).toBe(12);
    expect(wallSideLengthFt("S", 12, 10)).toBe(12);
    expect(wallSideLengthFt("E", 12, 10)).toBe(10);
    expect(wallSideLengthFt("W", 12, 10)).toBe(10);
  });
});

describe("openingAreaSF", () => {
  it("is width x height x quantity", () => {
    expect(openingAreaSF({ width_ft: 3, height_ft: 7, qty: 1 })).toBe(21);
    expect(openingAreaSF({ width_ft: 4, height_ft: 3, qty: 2 })).toBe(24);
  });
});

describe("defaultOpeningFor", () => {
  it("fills in the type's default size and floor-start flag", () => {
    const door = defaultOpeningFor("door");
    expect(door.width_ft).toBe(OPENING_TYPES.door.defaultWidthFt);
    expect(door.starts_at_floor).toBe(true);
    const window = defaultOpeningFor("window");
    expect(window.starts_at_floor).toBe(false);
  });
});

describe("missing-wall opening types", () => {
  it("open_no_wall behaves like a doorway: no baseboard where it sits", () => {
    const opening = defaultOpeningFor("open_no_wall");
    expect(opening.starts_at_floor).toBe(true);
    const wall = wallMeasurements("N", 12, 10, 8, [{ wall_side: "N", ...opening }]);
    expect(wall.openingsSF).toBe(opening.width_ft * opening.height_ft);
    expect(wall.baseboardLF).toBe(12 - opening.width_ft);
  });

  it("half_wall behaves like a window: baseboard still runs underneath it", () => {
    const opening = defaultOpeningFor("half_wall");
    expect(opening.starts_at_floor).toBe(false);
    const wall = wallMeasurements("N", 12, 10, 8, [{ wall_side: "N", ...opening }]);
    expect(wall.openingsSF).toBe(opening.width_ft * opening.height_ft);
    expect(wall.baseboardLF).toBe(12); // nothing deducted — the lower wall still stands
  });
});

describe("wallMeasurements", () => {
  it("computes gross/net SF and baseboard LF for a plain wall", () => {
    const result = wallMeasurements("N", 12, 10, 8, []);
    expect(result.lengthFt).toBe(12);
    expect(result.grossSF).toBe(96);
    expect(result.netSF).toBe(96);
    expect(result.baseboardLF).toBe(12);
  });

  it("deducts only the openings assigned to that specific wall side", () => {
    const openings = [
      { wall_side: "N", width_ft: 3, height_ft: 7, qty: 1, starts_at_floor: true }, // door, 21 SF
      { wall_side: "E", width_ft: 4, height_ft: 3, qty: 1, starts_at_floor: false }, // window, 12 SF
    ];
    const north = wallMeasurements("N", 12, 10, 8, openings);
    expect(north.openingsSF).toBe(21);
    expect(north.netSF).toBe(75); // 96 - 21
    expect(north.baseboardLF).toBe(9); // 12 - 3 (door width)

    const south = wallMeasurements("S", 12, 10, 8, openings);
    expect(south.openingsSF).toBe(0); // nothing assigned to this side
    expect(south.netSF).toBe(96);
  });
});

describe("computeRoomGeometry", () => {
  it("matches the spec's Test 1 exactly (12x10x8 room)", () => {
    const result = computeRoomGeometry({ widthFt: 12, lengthFt: 10, ceilingHeightFt: 8, openings: [] });
    expect(result.floorAreaSF).toBe(120);
    expect(result.ceilingAreaSF).toBe(120);
    expect(result.perimeterLF).toBe(44);
    expect(result.wallGrossAreaSF).toBe(352);
    expect(result.wallAreaSF).toBe(352); // no openings yet, net == gross
  });

  it("matches the spec's Test 2 exactly (a 3x7 door + 4x3 window)", () => {
    const openings = [
      { wall_side: "N", width_ft: 3, height_ft: 7, qty: 1, starts_at_floor: true },
      { wall_side: "E", width_ft: 4, height_ft: 3, qty: 1, starts_at_floor: false },
    ];
    const result = computeRoomGeometry({ widthFt: 12, lengthFt: 10, ceilingHeightFt: 8, openings });
    expect(result.openingsSF).toBe(33); // 21 + 12
    expect(result.wallGrossAreaSF).toBe(352);
    expect(result.wallNetAreaSF).toBe(319); // 352 - 33
    expect(result.wallAreaSF).toBe(319);
  });

  it("matches the Part 10 workflow test exactly (16x14x8 room)", () => {
    const result = computeRoomGeometry({ widthFt: 16, lengthFt: 14, ceilingHeightFt: 8, openings: [] });
    expect(result.floorAreaSF).toBe(224);
    expect(result.ceilingAreaSF).toBe(224);
    expect(result.perimeterLF).toBe(60);
    expect(result.wallGrossAreaSF).toBe(480);
  });

  it("computes room volume from floor area and ceiling height", () => {
    const result = computeRoomGeometry({ widthFt: 12, lengthFt: 10, ceilingHeightFt: 8, openings: [] });
    expect(result.roomVolumeCF).toBe(960); // 120 * 8
  });

  it("gives each of the 4 walls its own side and length", () => {
    const result = computeRoomGeometry({ widthFt: 12, lengthFt: 10, ceilingHeightFt: 8, openings: [] });
    const bySide = Object.fromEntries(result.walls.map((w) => [w.side, w.lengthFt]));
    expect(bySide).toEqual({ N: 12, S: 12, E: 10, W: 10 });
  });
});

describe("fitRectangleToAreaAndPerimeter", () => {
  it("recovers the exact rectangle when one really exists", () => {
    // A real 12x10 room: area 120, perimeter 44.
    const fit = fitRectangleToAreaAndPerimeter(120, 44);
    expect(fit.widthFt).toBe(12);
    expect(fit.lengthFt).toBe(10);
  });

  it("falls back to a square when no rectangle fits both numbers", () => {
    // Area 224 with an (impossibly small) perimeter of 56 for that area.
    const fit = fitRectangleToAreaAndPerimeter(224, 56);
    expect(fit.widthFt).toBe(fit.lengthFt);
    expect(fit.widthFt).toBeCloseTo(Math.sqrt(224), 1);
  });

  it("returns null for a non-positive area or perimeter", () => {
    expect(fitRectangleToAreaAndPerimeter(0, 44)).toBeNull();
    expect(fitRectangleToAreaAndPerimeter(120, 0)).toBeNull();
  });
});

describe("buildRoomHierarchy", () => {
  const bedroom = { id: "bed", name: "Master Bedroom", sort_order: 0 };
  const closet = { id: "closet", name: "Walk-in Closet", sort_order: 0, parent_room_id: "bed" };
  const bath = { id: "bath", name: "Master Bath", sort_order: 1, parent_room_id: "bed" };
  const kitchen = { id: "kitchen", name: "Kitchen", sort_order: 1 };

  it("puts parentless rooms at the top level, in sort order", () => {
    const tree = buildRoomHierarchy([kitchen, bedroom, closet, bath]);
    expect(tree.topLevel.map((r) => r.id)).toEqual(["bed", "kitchen"]);
  });

  it("groups a room's children under it, in sort order", () => {
    const tree = buildRoomHierarchy([kitchen, bedroom, closet, bath]);
    expect(tree.childrenOf("bed").map((r) => r.id)).toEqual(["closet", "bath"]);
    expect(tree.childrenOf("kitchen")).toEqual([]);
  });

  it("treats a room whose parent no longer exists as top-level", () => {
    const orphan = { id: "orphan", name: "Orphan", parent_room_id: "does-not-exist" };
    const tree = buildRoomHierarchy([orphan]);
    expect(tree.topLevel.map((r) => r.id)).toEqual(["orphan"]);
  });

  it("handles an empty or missing room list", () => {
    expect(buildRoomHierarchy([]).topLevel).toEqual([]);
    expect(buildRoomHierarchy(undefined).topLevel).toEqual([]);
  });
});
