export type SlabMeasurement = {
  lengthIn: number;
  widthIn: number;
  thicknessCm: number;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

const VALID_THICKNESSES_CM = new Set([2, 3]);

export function validateSlabMeasurement(
  measurement: Partial<SlabMeasurement>,
): ValidationResult {
  if (measurement.lengthIn === undefined) {
    return { ok: false, error: "missing required field: lengthIn" };
  }
  if (measurement.widthIn === undefined) {
    return { ok: false, error: "missing required field: widthIn" };
  }
  if (measurement.thicknessCm === undefined) {
    return { ok: false, error: "missing required field: thicknessCm" };
  }

  if (
    typeof measurement.lengthIn !== "number" ||
    typeof measurement.widthIn !== "number" ||
    typeof measurement.thicknessCm !== "number"
  ) {
    return { ok: false, error: "dimensions must be numbers" };
  }

  if (
    measurement.lengthIn <= 0 ||
    measurement.widthIn <= 0 ||
    measurement.thicknessCm <= 0
  ) {
    return { ok: false, error: "dimensions must be positive" };
  }

  if (measurement.lengthIn > 144 || measurement.widthIn > 60) {
    return { ok: false, error: "slab exceeds maximum dimensions" };
  }

  if (!VALID_THICKNESSES_CM.has(measurement.thicknessCm)) {
    return {
      ok: false,
      error: "thickness must be 2cm or 3cm",
    };
  }

  return { ok: true };
}
