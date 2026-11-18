import { describe, it, expect } from "vitest";
import {
  parseFeetInches,
  formatFeetInches,
  polygonPixelArea,
  pixelWallLengths,
  reconstructRealPoints,
  openingAreaSF,
  wallMeasurements,
  computeSketchMeasurements,
  upgradeLegacySketchData,
  newOpening,
  OPENING_TYPES,
} from "../sketch.js";

describe("parseFeetInches", () => {
  it("parses feet and inches with quote marks", () => {
    expect(parseFeetInches(`7'9"`)).toBeCloseTo(7.75);
    expect(parseFeetInches(`7' 9"`)).toBeCloseTo(7.75);
  });

  it("parses feet and inches written as ft/in", () => {
    expect(parseFeetInches("7ft 9in")).toBeCloseTo(7.75);
  });

  it("parses feet only", () => {
    expect(parseFeetInches(`8'`)).toBe(8);
    expect(parseFeetInches("8")).toBe(8);
  });

  it("parses a plain decimal as feet", () => {
    expect(parseFeetInches("7.75")).toBe(7.75);
  });

  it("parses inches-only input", () => {
    expect(parseFeetInches(`93"`)).toBeCloseTo(7.75);
  });

  it("returns null for empty or nonsense input", () => {
    expect(parseFeetInches("")).toBeNull();
    expect(parseFeetInches("abc")).toBeNull();
    expect(parseFeetInches(null)).toBeNull();
  });
});

describe("formatFeetInches", () => {
  it("formats whole feet without an inches part", () => {
    expect(formatFeetInches(8)).toBe("8'");
  });

  it("formats feet and inches", () => {
    expect(formatFeetInches(7.75)).toBe(`7'9"`);
  });

  it("returns empty string for 0 or invalid", () => {
    expect(formatFeetInches(0)).toBe("");
    expect(formatFeetInches(null)).toBe("");
  });
});

describe("polygonPixelArea", () => {
  it("computes the area of a square", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(polygonPixelArea(square)).toBe(100);
  });

  it("returns 0 for fewer than 3 points", () => {
    expect(polygonPixelArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });
});

describe("pixelWallLengths", () => {
  it("returns the length of each segment, wrapping to close the polygon", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(pixelWallLengths(square)).toEqual([10, 10, 10, 10]);
  });
});

describe("reconstructRealPoints", () => {
  it("rebuilds an exact rectangle from typed lengths and drawn right angles", () => {
    // Drawn as a 100x100 px square, typed as a real 12x10 ft room.
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const real = reconstructRealPoints(square, [12, 10, 12, 10]);
    expect(real).toEqual([
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: 10 },
      { x: 0, y: 10 },
    ]);
  });
});

describe("openingAreaSF", () => {
  it("multiplies width x height x quantity", () => {
    expect(openingAreaSF({ widthFt: 3, heightFt: 7, qty: 1 })).toBe(21);
    expect(openingAreaSF({ widthFt: 4, heightFt: 3, qty: 2 })).toBe(24);
  });
});

describe("newOpening", () => {
  it("fills in the type's default size and floor-start flag", () => {
    const door = newOpening("door");
    expect(door.widthFt).toBe(OPENING_TYPES.door.defaultWidthFt);
    expect(door.startsAtFloor).toBe(true);

    const window = newOpening("window");
    expect(window.startsAtFloor).toBe(false);
  });
});

describe("wallMeasurements", () => {
  it("computes gross/net SF and baseboard LF for a plain wall (no openings)", () => {
    const result = wallMeasurements({ lengthFt: 12, heightFt: null, openings: [] }, 8);
    expect(result.grossSF).toBe(96);
    expect(result.netSF).toBe(96);
    expect(result.baseboardLF).toBe(12);
  });

  it("deducts a real door and window from net SF (test scenario from the spec)", () => {
    // 12 LF wall, 8' tall -> 96 gross. A 3x7 door (21 SF) and a 4x3 window (12 SF).
    const wall = {
      lengthFt: 12,
      heightFt: null,
      openings: [
        { widthFt: 3, heightFt: 7, qty: 1, startsAtFloor: true },
        { widthFt: 4, heightFt: 3, qty: 1, startsAtFloor: false },
      ],
    };
    const result = wallMeasurements(wall, 8);
    expect(result.grossSF).toBe(96);
    expect(result.openingsSF).toBe(33); // 21 + 12
    expect(result.netSF).toBe(63); // 96 - 33
    // Baseboard is exempt under the door's 3 ft width, not the window's.
    expect(result.baseboardLF).toBe(9); // 12 - 3
  });

  it("uses a per-wall height override instead of the room's ceiling height", () => {
    const result = wallMeasurements({ lengthFt: 10, heightFt: 10, openings: [] }, 8);
    expect(result.grossSF).toBe(100);
  });

  it("computes a flood-cut SF, exempting floor-starting openings' width", () => {
    const wall = {
      lengthFt: 12,
      heightFt: 8,
      openings: [{ widthFt: 3, heightFt: 7, qty: 1, startsAtFloor: true }],
      floodCut: { enabled: true, heightFt: 2 },
    };
    const result = wallMeasurements(wall, 8);
    // (12 - 3) exempt door width * 2 ft cut = 18 SF
    expect(result.floodCutSF).toBe(18);
  });

  it("gives a 12 LF wall at a 2 ft flood cut = 24 SF with no openings (spec example)", () => {
    const result = wallMeasurements({ lengthFt: 12, floodCut: { enabled: true, heightFt: 2 } }, 8);
    expect(result.floodCutSF).toBe(24);
  });
});

describe("computeSketchMeasurements", () => {
  const squarePoints = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  function wallsOf(lengths) {
    return lengths.map((lengthFt) => ({ lengthFt, heightFt: null, openings: [] }));
  }

  it("computes the exact floor/ceiling/wall/perimeter for a precisely-drawn rectangle (spec Test 1)", () => {
    const result = computeSketchMeasurements({
      points: squarePoints,
      walls: wallsOf([12, 10, 12, 10]),
      ceilingHeightFt: 8,
    });
    expect(result.floorAreaSF).toBe(120);
    expect(result.ceilingAreaSF).toBe(120);
    expect(result.perimeterLF).toBe(44);
    expect(result.wallGrossAreaSF).toBe(352);
    expect(result.wallAreaSF).toBe(352); // no openings yet, net == gross
  });

  it("nets out real door/window openings on specific walls (spec Test 2)", () => {
    const walls = wallsOf([12, 10, 12, 10]);
    walls[0].openings = [{ widthFt: 3, heightFt: 7, qty: 1, startsAtFloor: true }]; // door, 21 SF
    walls[1].openings = [{ widthFt: 4, heightFt: 3, qty: 1, startsAtFloor: false }]; // window, 12 SF

    const result = computeSketchMeasurements({
      points: squarePoints,
      walls,
      ceilingHeightFt: 8,
    });
    expect(result.wallGrossAreaSF).toBe(352);
    expect(result.wallNetAreaSF).toBe(319); // 352 - 21 - 12
    expect(result.wallAreaSF).toBe(319);
  });

  it("still gives a real (if imperfect) area when drawn angles aren't quite square", () => {
    // A lopsided drawn quadrilateral, but the same typed 10x10 real room.
    const unevenPoints = [
      { x: 0, y: 0 },
      { x: 90, y: 5 },
      { x: 95, y: 100 },
      { x: 5, y: 95 },
    ];
    const result = computeSketchMeasurements({
      points: unevenPoints,
      walls: wallsOf([10, 10, 10, 10]),
      ceilingHeightFt: 8,
    });
    expect(result.perimeterLF).toBe(40);
    expect(result.floorAreaSF).toBeGreaterThan(70);
    expect(result.floorAreaSF).toBeLessThan(130);
  });

  it("computes baseboard LF netting out door widths only, not windows", () => {
    const walls = wallsOf([12, 10, 12, 10]);
    walls[0].openings = [{ widthFt: 3, heightFt: 7, qty: 1, startsAtFloor: true }];
    walls[1].openings = [{ widthFt: 4, heightFt: 3, qty: 1, startsAtFloor: false }];
    const result = computeSketchMeasurements({ points: squarePoints, walls, ceilingHeightFt: 8 });
    expect(result.baseboardLF).toBe(41); // 44 - 3 (door only)
  });

  it("computes room volume from floor area and average wall height", () => {
    const result = computeSketchMeasurements({
      points: squarePoints,
      walls: wallsOf([12, 10, 12, 10]),
      ceilingHeightFt: 8,
    });
    expect(result.roomVolumeCF).toBe(960); // 120 SF * 8'
  });
});

describe("upgradeLegacySketchData", () => {
  it("converts the old parallel-array shape into per-wall objects", () => {
    const legacy = {
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
      wallLengths: ["12", "10", "12", "10"],
      doorWalls: [0],
      windowWalls: [1],
    };
    const upgraded = upgradeLegacySketchData(legacy);
    expect(upgraded.walls).toHaveLength(4);
    expect(upgraded.walls[0].lengthFt).toBe(12);
    expect(upgraded.walls[0].openings[0].type).toBe("door");
    expect(upgraded.walls[1].openings[0].type).toBe("window");
    expect(upgraded.walls[2].openings).toEqual([]);
  });

  it("passes through data that's already in the current shape", () => {
    const current = { points: [], walls: [{ lengthFt: 5, openings: [] }] };
    expect(upgradeLegacySketchData(current)).toBe(current);
  });

  it("returns falsy input unchanged", () => {
    expect(upgradeLegacySketchData(null)).toBeNull();
    expect(upgradeLegacySketchData(undefined)).toBeUndefined();
  });
});
