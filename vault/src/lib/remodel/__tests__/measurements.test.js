import { describe, it, expect } from "vitest";
import {
  hasMeasurements,
  floorAreaSF,
  ceilingAreaSF,
  perimeterLF,
  wallAreaSF,
} from "../measurements.js";

describe("hasMeasurements", () => {
  it("is true once length and width are both set", () => {
    expect(hasMeasurements({ length_ft: 10, width_ft: 12 })).toBe(true);
  });

  it("is false when either dimension is missing", () => {
    expect(hasMeasurements({ length_ft: 10 })).toBe(false);
    expect(hasMeasurements({})).toBe(false);
  });
});

describe("floorAreaSF / ceilingAreaSF", () => {
  it("multiplies length by width", () => {
    const room = { length_ft: 10, width_ft: 12 };
    expect(floorAreaSF(room)).toBe(120);
    expect(ceilingAreaSF(room)).toBe(120);
  });

  it("returns 0 without measurements", () => {
    expect(floorAreaSF({})).toBe(0);
  });
});

describe("perimeterLF", () => {
  it("is twice the sum of length and width", () => {
    expect(perimeterLF({ length_ft: 10, width_ft: 12 })).toBe(44);
  });
});

describe("wallAreaSF", () => {
  it("computes gross wall area at the given ceiling height", () => {
    const room = { length_ft: 10, width_ft: 12, ceiling_height_ft: 8 };
    expect(wallAreaSF(room)).toBe(44 * 8);
  });

  it("defaults ceiling height to 8 ft when not set", () => {
    const room = { length_ft: 10, width_ft: 12 };
    expect(wallAreaSF(room)).toBe(44 * 8);
  });

  it("deducts door and window openings", () => {
    const room = { length_ft: 10, width_ft: 12, ceiling_height_ft: 8, door_count: 1, window_count: 2 };
    expect(wallAreaSF(room)).toBe(44 * 8 - 20 - 2 * 15);
  });

  it("never goes negative", () => {
    const room = { length_ft: 4, width_ft: 4, ceiling_height_ft: 8, door_count: 5, window_count: 5 };
    expect(wallAreaSF(room)).toBe(0);
  });
});

describe("sketch-derived measurements take priority over length/width", () => {
  const sketched = {
    length_ft: 10,
    width_ft: 12,
    sketch_perimeter_lf: 50,
    sketch_floor_area_sf: 140,
    sketch_ceiling_area_sf: 140,
    sketch_wall_area_sf: 350,
  };

  it("uses the sketch numbers instead of recomputing from length/width", () => {
    expect(hasMeasurements(sketched)).toBe(true);
    expect(floorAreaSF(sketched)).toBe(140);
    expect(ceilingAreaSF(sketched)).toBe(140);
    expect(perimeterLF(sketched)).toBe(50);
    expect(wallAreaSF(sketched)).toBe(350);
  });

  it("falls back to length/width when there's no sketch", () => {
    const room = { length_ft: 10, width_ft: 12 };
    expect(floorAreaSF(room)).toBe(120);
  });
});
