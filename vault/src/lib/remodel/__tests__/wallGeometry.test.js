import { describe, it, expect } from "vitest";
import {
  polygonAreaSqIn,
  polygonPerimeterIn,
  computeRoomGeometryFromWalls,
  rectangleRoomToWallLoop,
  sqInToSqFt,
  inToFt,
} from "../wallGeometry.js";
import { computeRoomGeometry } from "../floorplanGeometry.js";

describe("polygonAreaSqIn / polygonPerimeterIn", () => {
  it("matches width x height for a plain rectangle, in inches", () => {
    // 10ft x 8ft room = 120in x 96in.
    const points = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 96 },
      { x: 0, y: 96 },
    ];
    expect(polygonAreaSqIn(points)).toBe(120 * 96);
    expect(polygonPerimeterIn(points)).toBe(2 * (120 + 96));
  });
});

describe("computeRoomGeometryFromWalls vs. the existing rectangle math (no openings yet)", () => {
  // Every case here is a plain rectangle room with no doors/windows, since
  // Phase 1 doesn't move openings onto walls yet — the point is proving
  // the new polygon-walking math agrees with the old width*length math
  // before anything in the UI depends on it.
  const cases = [
    { widthFt: 12, lengthFt: 10, ceilingHeightFt: 8 }, // spec Test 1
    { widthFt: 16, lengthFt: 14, ceilingHeightFt: 8 }, // Part 10 workflow test
    { widthFt: 23.5, lengthFt: 10, ceilingHeightFt: 8 }, // irregular, Frank's "Living" room
    { widthFt: 10, lengthFt: 10, ceilingHeightFt: 9 }, // a non-default ceiling height
  ];

  for (const c of cases) {
    it(`matches for a ${c.widthFt}x${c.lengthFt}x${c.ceilingHeightFt} room`, () => {
      const legacy = computeRoomGeometry({ ...c, openings: [] });
      const { points, wallHeightsIn } = rectangleRoomToWallLoop(c);
      const fromWalls = computeRoomGeometryFromWalls({ points, wallHeightsIn });

      expect(fromWalls.floorAreaSF).toBe(legacy.floorAreaSF);
      expect(fromWalls.ceilingAreaSF).toBe(legacy.ceilingAreaSF);
      expect(fromWalls.perimeterLF).toBe(legacy.perimeterLF);
      expect(fromWalls.wallGrossAreaSF).toBe(legacy.wallGrossAreaSF);
      expect(fromWalls.roomVolumeCF).toBe(legacy.roomVolumeCF);
    });
  }

  it("gives each of the 4 walls its own length and height, in order N/E/S/W", () => {
    const { points, wallHeightsIn } = rectangleRoomToWallLoop({ widthFt: 12, lengthFt: 10, ceilingHeightFt: 8 });
    const result = computeRoomGeometryFromWalls({ points, wallHeightsIn });
    expect(result.walls.map((w) => w.lengthFt)).toEqual([12, 10, 12, 10]); // N, E, S, W
    expect(result.walls.every((w) => w.heightFt === 8)).toBe(true);
  });

  it("supports a different height per wall (unlike the rectangle-only model)", () => {
    const { points } = rectangleRoomToWallLoop({ widthFt: 12, lengthFt: 10, ceilingHeightFt: 8 });
    const result = computeRoomGeometryFromWalls({
      points,
      wallHeightsIn: [96, 96, 96, 120], // the west wall is 10ft instead of 8ft
    });
    expect(result.walls[3].heightFt).toBe(10);
    expect(result.walls[3].grossSF).toBe(100); // 10ft wall x 10ft height
  });
});

describe("unit helpers", () => {
  it("convert inches/square-inches to feet/square-feet", () => {
    expect(inToFt(12)).toBe(1);
    expect(sqInToSqFt(144)).toBe(1);
  });
});
