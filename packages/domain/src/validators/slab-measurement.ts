export type SlabMeasurement = {
  lengthIn: number;
  widthIn: number;
  thicknessIn: number;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

const VALID_THICKNESSES = new Set([0.5, 0.75, 1.25]);

export function validateSlabMeasurement(
  measurement: Partial<SlabMeasurement>,
): ValidationResult {
  if (measurement.lengthIn === undefined) {
    return { ok: false, error: "missing required field: lengthIn" };
  }
  if (measurement.widthIn === undefined) {
    return { ok: false, error: "missing required field: widthIn" };
  }
  if (measurement.thicknessIn === undefined) {
    return { ok: false, error: "missing required field: thicknessIn" };
  }

  if (
    typeof measurement.lengthIn !== "number" ||
    typeof measurement.widthIn !== "number" ||
    typeof measurement.thicknessIn !== "number"
  ) {
    return { ok: false, error: "dimensions must be numbers" };
  }

  if (
    measurement.lengthIn <= 0 ||
    measurement.widthIn <= 0 ||
    measurement.thicknessIn <= 0
  ) {
    return { ok: false, error: "dimensions must be positive" };
  }

  if (measurement.lengthIn > 144 || measurement.widthIn > 60) {
    return { ok: false, error: "slab exceeds maximum dimensions" };
  }

  if (!VALID_THICKNESSES.has(measurement.thicknessIn)) {
    return {
      ok: false,
      error: "thickness must be 0.5in, 0.75in, or 1.25in",
    };
  }

  return { ok: true };
}
