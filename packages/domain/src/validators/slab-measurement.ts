export type SlabMeasurement = {
  lengthIn: number;
  widthIn: number;
  thicknessIn: number;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

const VALID_THICKNESSES_IN = new Set([2 / 2.54, 3 / 2.54]);

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
    !Number.isFinite(measurement.lengthIn) ||
    !Number.isFinite(measurement.widthIn) ||
    !Number.isFinite(measurement.thicknessIn)
  ) {
    return { ok: false, error: "dimensions must be finite numbers" };
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

  if (!VALID_THICKNESSES_IN.has(measurement.thicknessIn)) {
    return {
      ok: false,
      error: "thickness must be 2cm or 3cm",
    };
  }

  return { ok: true };
}
