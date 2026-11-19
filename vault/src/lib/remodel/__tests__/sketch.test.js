import { describe, it, expect } from "vitest";
import {
  parseFeetInches,
  formatFeetInches,
  polygonPixelArea,
  pixelWallLengths,
  wallLengthFt,
  snapPointToExactLength,
  openingAreaSF,
  wallMeasurements,
  computeSketchMeasurements,
  upgradeLegacySketchData,
  newOpening,
  OPENING_TYPES,
  DEFAULT_PIXELS_PER_FOOT,
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

describe("wallLengthFt", () => {
  it("is the pixel distance divided by the sketch's scale", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 240, y: 0 }, // 240px at 20px/ft = 12 ft
    ];
    expect(wallLengthFt(points, 0, 20)).toBe(12);
  });
});

describe("snapPointToExactLength", () => {
  it("moves the far corner to exactly the typed length, keeping the drawn direction", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 }, // drawn at 5ft (100px / 20px/ft), pointing +x
      { x: 100, y: 100 },
    ];
    const next = snapPointToExactLength(points, 0, 12, 20); // snap wall 0 to 12 ft
    expect(next[1]).toEqual({ x: 240, y: 0 });
    expect(next[0]).toEqual(points[0]); // near corner unchanged
    expect(next[2]).toEqual(points[2]); // unrelated corner unchanged
  });

  it("wraps to the first point for the closing wall", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    // Wall 3 runs from points[3] back to points[0] (straight up, in -y).
    const next = snapPointToExactLength(points, 3, 10, 20);
    expect(next[0]).toEqual({ x: 0, y: -100 });
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
    const result = wallMeasurements({ heightFt: null, openings: [] }, 12, 8);
    expect(result.grossSF).toBe(96);
    expect(result.netSF).toBe(96);
    expect(result.baseboardLF).toBe(12);
  });

  it("deducts a real door and window from net SF (test scenario from the spec)", () => {
    // 12 LF wall, 8' tall -> 96 gross. A 3x7 door (21 SF) and a 4x3 window (12 SF).
    const wall = {
      heightFt: null,
      openings: [
        { widthFt: 3, heightFt: 7, qty: 1, startsAtFloor: true },
        { widthFt: 4, heightFt: 3, qty: 1, startsAtFloor: false },
      ],
    };
    const result = wallMeasurements(wall, 12, 8);
    expect(result.grossSF).toBe(96);
    expect(result.openingsSF).toBe(33); // 21 + 12
    expect(result.netSF).toBe(63); // 96 - 33
    // Baseboard is exempt under the door's 3 ft width, not the window's.
    expect(result.baseboardLF).toBe(9); // 12 - 3
  });

  it("uses a per-wall height override instead of the room's ceiling height", () => {
    const result = wallMeasurements({ heightFt: 10, openings: [] }, 10, 8);
    expect(result.grossSF).toBe(100);
  });

  it("computes a flood-cut SF, exempting floor-starting openings' width", () => {
    const wall = {
      heightFt: 8,
      openings: [{ widthFt: 3, heightFt: 7, qty: 1, startsAtFloor: true }],
      floodCut: { enabled: true, heightFt: 2 },
    };
    const result = wallMeasurements(wall, 12, 8);
    // (12 - 3) exempt door width * 2 ft cut = 18 SF
    expect(result.floodCutSF).toBe(18);
  });

  it("gives a 12 LF wall at a 2 ft flood cut = 24 SF with no openings (spec example)", () => {
    const result = wallMeasurements({ floodCut: { enabled: true, heightFt: 2 } }, 12, 8);
    expect(result.floodCutSF).toBe(24);
  });
});

describe("computeSketchMeasurements", () => {
  // Drawn at the default scale (20px = 1ft): a 240x200px rectangle is
  // exactly a real 12x10 ft room — no separate typed-length step at all.
  const rectPoints = [
    { x: 0, y: 0 },
    { x: 240, y: 0 },
    { x: 240, y: 200 },
    { x: 0, y: 200 },
  ];

  function blankWalls(n) {
    return Array.from({ length: n }, () => ({ heightFt: null, openings: [] }));
  }

  it("computes the exact floor/ceiling/wall/perimeter straight from the drawing (spec Test 1)", () => {
    const result = computeSketchMeasurements({
      points: rectPoints,
      walls: blankWalls(4),
      pixelsPerFoot: DEFAULT_PIXELS_PER_FOOT,
      ceilingHeightFt: 8,
    });
    expect(result.floorAreaSF).toBe(120);
    expect(result.ceilingAreaSF).toBe(120);
    expect(result.perimeterLF).toBe(44);
    expect(result.wallGrossAreaSF).toBe(352);
    expect(result.wallAreaSF).toBe(352); // no openings yet, net == gross
  });

  it("nets out real door/window openings on specific walls (spec Test 2)", () => {
    const walls = blankWalls(4);
    walls[0].openings = [{ widthFt: 3, heightFt: 7, qty: 1, startsAtFloor: true }]; // door, 21 SF
    walls[1].openings = [{ widthFt: 4, heightFt: 3, qty: 1, startsAtFloor: false }]; // window, 12 SF

    const result = computeSketchMeasurements({
      points: rectPoints,
      walls,
      pixelsPerFoot: DEFAULT_PIXELS_PER_FOOT,
      ceilingHeightFt: 8,
    });
    expect(result.wallGrossAreaSF).toBe(352);
    expect(result.wallNetAreaSF).toBe(319); // 352 - 21 - 12
    expect(result.wallAreaSF).toBe(319);
  });

  it("gives the exact area of an irregular (non-rectangular) room too", () => {
    // An L-shape, 240x200px at 20px/ft: a 12x10 rectangle minus a 4x5 bite.
    const lShape = [
      { x: 0, y: 0 },
      { x: 240, y: 0 },
      { x: 240, y: 100 },
      { x: 160, y: 100 },
      { x: 160, y: 200 },
      { x: 0, y: 200 },
    ];
    const result = computeSketchMeasurements({
      points: lShape,
      walls: blankWalls(6),
      pixelsPerFoot: DEFAULT_PIXELS_PER_FOOT,
      ceilingHeightFt: 8,
    });
    // 12x10 (120) minus the 4x5 notch (20) = 100 SF, exactly.
    expect(result.floorAreaSF).toBe(100);
  });

  it("respects a different scale (e.g. 1 grid square = 2 ft for a bigger room)", () => {
    const result = computeSketchMeasurements({
      points: rectPoints,
      walls: blankWalls(4),
      pixelsPerFoot: 10, // 20px grid square / 2 ft
      ceilingHeightFt: 8,
    });
    // Same pixel rectangle, half the scale -> double the real dimensions.
    expect(result.perimeterLF).toBe(88);
    expect(result.floorAreaSF).toBe(480);
  });

  it("computes baseboard LF netting out door widths only, not windows", () => {
    const walls = blankWalls(4);
    walls[0].openings = [{ widthFt: 3, heightFt: 7, qty: 1, startsAtFloor: true }];
    walls[1].openings = [{ widthFt: 4, heightFt: 3, qty: 1, startsAtFloor: false }];
    const result = computeSketchMeasurements({
      points: rectPoints,
      walls,
      pixelsPerFoot: DEFAULT_PIXELS_PER_FOOT,
      ceilingHeightFt: 8,
    });
    expect(result.baseboardLF).toBe(41); // 44 - 3 (door only)
  });

  it("computes room volume from floor area and average wall height", () => {
    const result = computeSketchMeasurements({
      points: rectPoints,
      walls: blankWalls(4),
      pixelsPerFoot: DEFAULT_PIXELS_PER_FOOT,
      ceilingHeightFt: 8,
    });
    expect(result.roomVolumeCF).toBe(960); // 120 SF * 8'
  });
});

describe("upgradeLegacySketchData", () => {
  it("fits a scale from the oldest shape (parallel wallLengths/doorWalls/windowWalls)", () => {
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
    expect(upgraded.pixelsPerFoot).toBeGreaterThan(0);
    expect(upgraded.walls).toHaveLength(4);
    expect(upgraded.walls[0].openings[0].type).toBe("door");
    expect(upgraded.walls[1].openings[0].type).toBe("window");
    expect(upgraded.walls[2].openings).toEqual([]);
    // The fitted scale should reproduce roughly the same real perimeter.
    const lengths = upgraded.points.map((_, i) => wallLengthFt(upgraded.points, i, upgraded.pixelsPerFoot));
    expect(lengths.reduce((s, l) => s + l, 0)).toBeCloseTo(44, 1);
  });

  it("fits a scale from the mid shape (per-wall lengthFt, no shared scale yet)", () => {
    const mid = {
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
      walls: [
        { lengthFt: 12, openings: [], demo: false, replace: false, floodCut: null, notes: "" },
        { lengthFt: 10, openings: [], demo: false, replace: false, floodCut: null, notes: "" },
        { lengthFt: 12, openings: [], demo: false, replace: false, floodCut: null, notes: "" },
        { lengthFt: 10, openings: [], demo: false, replace: false, floodCut: null, notes: "" },
      ],
    };
    const upgraded = upgradeLegacySketchData(mid);
    expect(upgraded.pixelsPerFoot).toBeGreaterThan(0);
    expect(upgraded.walls[0]).not.toHaveProperty("lengthFt");
  });

  it("passes through data that's already in the current shape", () => {
    const current = { points: [], pixelsPerFoot: 20, walls: [{ openings: [] }] };
    expect(upgradeLegacySketchData(current)).toBe(current);
  });

  it("returns falsy input unchanged", () => {
    expect(upgradeLegacySketchData(null)).toBeNull();
    expect(upgradeLegacySketchData(undefined)).toBeUndefined();
  });
});
