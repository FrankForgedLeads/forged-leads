import { describe, it, expect } from "vitest";
import {
  parseFeetInches,
  formatFeetInches,
  polygonPixelArea,
  pixelWallLengths,
  computeSketchMeasurements,
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

describe("computeSketchMeasurements", () => {
  const squarePoints = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it("computes exact perimeter and wall area from typed lengths, approximate floor area from the drawn shape", () => {
    // Drawn as a 100x100 px square but typed as a real 10x10 ft room.
    const result = computeSketchMeasurements({
      points: squarePoints,
      wallLengths: [10, 10, 10, 10],
      ceilingHeightFt: 8,
    });
    expect(result.perimeterLF).toBe(40);
    expect(result.floorAreaSF).toBe(100);
    expect(result.ceilingAreaSF).toBe(100);
    expect(result.wallAreaSF).toBe(40 * 8);
  });

  it("deducts doors and windows per flagged wall", () => {
    const result = computeSketchMeasurements({
      points: squarePoints,
      wallLengths: [10, 10, 10, 10],
      ceilingHeightFt: 8,
      doorWalls: [0],
      windowWalls: [2],
    });
    expect(result.wallAreaSF).toBe(40 * 8 - 20 - 15);
  });

  it("still gives a real (if rough) area when the drawn shape is uneven but lengths are typed accurately", () => {
    // A lopsided drawn quadrilateral, but the same typed 10x10 real room.
    const unevenPoints = [
      { x: 0, y: 0 },
      { x: 90, y: 5 },
      { x: 95, y: 100 },
      { x: 5, y: 95 },
    ];
    const result = computeSketchMeasurements({
      points: unevenPoints,
      wallLengths: [10, 10, 10, 10],
      ceilingHeightFt: 8,
    });
    expect(result.perimeterLF).toBe(40);
    // Approximate floor area should be in a reasonable ballpark of 100 SF.
    expect(result.floorAreaSF).toBeGreaterThan(70);
    expect(result.floorAreaSF).toBeLessThan(130);
  });
});
