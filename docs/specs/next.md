# Feature Spec: slab-measurement-validator

## Overview
Pure utility in `packages/domain` that validates slab measurement inputs before they reach the database. Countertop slabs arrive with length/width/thickness in inches. The validator rejects bad inputs early so API handlers stay thin.

## Package target
`packages/domain`

## Test type
unit

## Acceptance criteria

1. **Valid measurement passes** — `validateSlabMeasurement({ lengthIn: 120, widthIn: 26, thicknessIn: 0.75 })` returns `{ ok: true }`.

2. **Zero or negative dimensions rejected** — length, width, or thickness ≤ 0 returns `{ ok: false, error: "dimensions must be positive" }`.

3. **Unreasonably large slab rejected** — length > 144 inches (12 ft) or width > 60 inches (5 ft) returns `{ ok: false, error: "slab exceeds maximum dimensions" }`.

4. **Thickness outside standard range rejected** — thickness not in `[0.5, 0.75, 1.25]` inches returns `{ ok: false, error: "thickness must be 0.5in, 0.75in, or 1.25in" }`.

5. **Missing fields rejected** — calling with a partial object (e.g. no `thicknessIn`) returns `{ ok: false, error: "missing required field: thicknessIn" }`.

6. **Non-numeric input rejected** — passing a string as any dimension returns `{ ok: false, error: "dimensions must be numbers" }`.

## Types to define
```ts
type SlabMeasurement = {
  lengthIn: number;   // inches
  widthIn: number;    // inches
  thicknessIn: number; // inches — valid: 0.5, 0.75, 1.25
};

type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };
```

## File to create
`packages/domain/src/validators/slab-measurement.ts`

## Export from
`packages/domain/src/index.ts` (or create if not present)

## Notes
- Pure function, no imports from frameworks or Node built-ins
- All values in inches — never mm
- Thickness values are US countertop industry standards (1/2", 3/4", 1-1/4")
