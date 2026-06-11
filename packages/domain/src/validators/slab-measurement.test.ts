import { describe, expect, it } from "vitest";
import { validateSlabMeasurement } from "./slab-measurement.js";

describe("validateSlabMeasurement", () => {
  it("accepts valid measurements", () => {
    expect(
      validateSlabMeasurement({
        lengthIn: 120,
        widthIn: 26,
        thicknessIn: 3 / 2.54,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects zero or negative dimensions", () => {
    expect(
      validateSlabMeasurement({
        lengthIn: 0,
        widthIn: 26,
        thicknessIn: 3 / 2.54,
      }),
    ).toEqual({ ok: false, error: "dimensions must be positive" });
  });

  it("rejects oversized slabs", () => {
    expect(
      validateSlabMeasurement({
        lengthIn: 145,
        widthIn: 26,
        thicknessIn: 3 / 2.54,
      }),
    ).toEqual({ ok: false, error: "slab exceeds maximum dimensions" });
  });

  it("rejects invalid thicknesses", () => {
    expect(
      validateSlabMeasurement({
        lengthIn: 120,
        widthIn: 26,
        thicknessIn: 1,
      }),
    ).toEqual({
      ok: false,
      error: "thickness must be 2cm or 3cm",
    });
  });

  it("rejects missing fields", () => {
    expect(
      validateSlabMeasurement({
        lengthIn: 120,
        widthIn: 26,
      } as Partial<{ lengthIn: number; widthIn: number; thicknessIn: number }>),
    ).toEqual({ ok: false, error: "missing required field: thicknessIn" });
  });

  it("rejects non-numeric input", () => {
    expect(
      validateSlabMeasurement({
        lengthIn: "120" as unknown as number,
        widthIn: 26,
        thicknessIn: 3 / 2.54,
      }),
    ).toEqual({ ok: false, error: "dimensions must be finite numbers" });
  });
});
