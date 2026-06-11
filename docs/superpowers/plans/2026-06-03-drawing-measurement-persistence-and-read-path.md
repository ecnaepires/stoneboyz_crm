# Drawing Measurement Persistence & Read-Path Cut — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the drawing `layout` the single source of truth for a Sheet's measurement totals — persist the fields the totals need, derive area from the whole chain, and cut the API + web read path off the normalized `counter_pieces` / `edge_segments` / `sink_cutouts` tables.

**Architecture:** Totals are computed by the domain function `measurementTotalsFromLayout(layout)` (already exists, ADR 0003 step 2). This plan closes the gaps that block it on *persisted* data: the save schema must carry `kind` / `quantity` / `faucetHoleCount`, and piece area must be the union of all chain segments (not just `segments[0]`). Then the API reads the latest `drawing_revisions.layout` per area and the web consumes the full domain totals contract. The normalized tables and their forms remain (their removal is ADR 0003 steps 4–5); only the *totals read path* moves to the layout.

**Tech Stack:** TypeScript, Zod (domain schemas), NestJS + `pg` (API), Next.js + generated `@stoneboyz/api-client` (web), Vitest.

**Scope boundaries:**
- IN: schema fields, union area, rectangle-case edge length, canvas serialization, API totals read, pricing totals source, web narrow-type removal, integration-test reseeding.
- OUT (deferred): dropping the normalized tables (ADR 0003 step 4), removing the hand-entry forms / UI reshape (step 5), and **multi-segment (L/U) finished-edge linear footage** — the persisted edge schema cannot address per-segment boundary edges, so finished-edge feet is only guaranteed correct for single-segment (rectangle) pieces. Tracked as a known gap for the step-5 edge-tool reshape.

**Reference docs:** [ADR 0002](../../adr/0002-drawing-geometry-redesign.md) (chain-only geometry, inches-are-truth, `chainShapeGeometry` is the one edge derivation), [ADR 0003](../../adr/0003-drawing-workspace-field-first.md) (drawing is the single source of truth), [CONTEXT.md](../../../CONTEXT.md) (Finished Edge, Square Footage glossary).

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `packages/domain/src/quotes/quote-drawing.schemas.ts` | Zod validation for persisted layout | Add `kind`, `quantity`, `faucetHoleCount` |
| `packages/domain/src/quotes/quote-drawing.schemas.test.ts` | Schema round-trip tests | Create/extend |
| `packages/domain/src/drawing/geometry.ts` | Canonical chain geometry | Add `chainShapeAreaSqIn` |
| `packages/domain/src/drawing/geometry.test.ts` | Geometry unit tests | Add area tests |
| `packages/domain/src/drawing/index.ts` | Drawing barrel | Export new fn |
| `packages/domain/src/quotes/quote-measurements-from-layout.ts` | Layout → totals converter | Use union area |
| `packages/domain/src/quotes/quote-measurements-from-layout.test.ts` | Converter tests | Multi-segment + L area |
| `apps/web/.../DrawingCanvasInner.tsx` | Canvas serialization | Persist `kind` / sink `quantity` / `faucetHoleCount` |
| `apps/api/src/quotes/quote-areas.repository.ts` | Area totals source | Derive from latest layout; delete SQL totals |
| `apps/api/src/quotes/quote-pricing.service.ts` | Price-line generation | Source totals from layout |
| `apps/web/.../MeasurementsCard.tsx` | Sheet totals display | Use generated API type |
| `tests/integration/quote-measurements.test.ts` | Golden totals acceptance | Reseed via layout |
| `tests/integration/quote-pricing.test.ts` | Pricing acceptance | Reseed via layout |

---

## Task 1: Persist `kind` on pieces in the save schema

**Files:**
- Modify: `packages/domain/src/quotes/quote-drawing.schemas.ts:40-47`
- Test: `packages/domain/src/quotes/quote-drawing.schemas.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `quote-drawing.schemas.test.ts` (create the file with this content if it does not exist; otherwise append the `describe`):

```ts
import { describe, expect, it } from 'vitest';
import { canvasLayoutSchema } from './quote-drawing.schemas.js';

const PIECE_ID = '00000000-0000-4000-8000-000000000001';

describe('canvasLayoutSchema piece kind', () => {
  it('preserves an explicit backsplash kind', () => {
    const parsed = canvasLayoutSchema.parse({
      pieces: [
        {
          pieceId: PIECE_ID,
          x: 0,
          y: 0,
          rotation: 0,
          kind: 'backsplash',
          shape: { type: 'chain', segments: [
            { x: 0, y: 0, w: 300, h: 12, lengthIn: 100, widthIn: 4, orientation: 'horizontal' },
            { x: 0, y: 0, w: 12, h: 12, lengthIn: 4, widthIn: 4, orientation: 'vertical' }
          ] }
        }
      ]
    });

    expect(parsed.pieces[0]?.kind).toBe('backsplash');
  });

  it('defaults kind to countertop when omitted', () => {
    const parsed = canvasLayoutSchema.parse({
      pieces: [{ pieceId: PIECE_ID, x: 0, y: 0, rotation: 0 }]
    });

    expect(parsed.pieces[0]?.kind).toBe('countertop');
  });
});
```bash

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/domain/src/quotes/quote-drawing.schemas.test.ts`
Expected: FAIL — `kind` is `undefined` (schema strips the unknown key).

- [ ] **Step 3: Add `kind` to the piece schema**

In `quote-drawing.schemas.ts`, change `canvasPieceLayoutSchema` (lines 40-47) to add the field after `rotation`:

```ts
const canvasPieceLayoutSchema = z.object({
  pieceId: z.string().uuid(),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  kind: z.enum(["countertop", "backsplash"]).default("countertop"),
  groupId: z.string().uuid().nullable().optional(),
  shape: canvasPieceShapeSchema.nullable().optional(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/domain/src/quotes/quote-drawing.schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/quotes/quote-drawing.schemas.ts packages/domain/src/quotes/quote-drawing.schemas.test.ts
git commit -m "feat(domain): persist piece kind in the drawing layout schema"
```

---

## Task 2: Persist sink `quantity` and `faucetHoleCount` in the save schema

**Files:**
- Modify: `packages/domain/src/quotes/quote-drawing.schemas.ts:49-55`
- Test: `packages/domain/src/quotes/quote-drawing.schemas.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `quote-drawing.schemas.test.ts`:

```ts
describe('canvasLayoutSchema sink counts', () => {
  const SINK_ID = '00000000-0000-4000-8000-000000000002';

  it('preserves quantity and faucet hole count', () => {
    const parsed = canvasLayoutSchema.parse({
      sinks: [{ sinkId: SINK_ID, pieceId: null, x: 0, y: 0, rotation: 0, quantity: 2, faucetHoleCount: 3 }]
    });

    expect(parsed.sinks[0]?.quantity).toBe(2);
    expect(parsed.sinks[0]?.faucetHoleCount).toBe(3);
  });

  it('defaults quantity to 1 and faucet holes to 0', () => {
    const parsed = canvasLayoutSchema.parse({
      sinks: [{ sinkId: SINK_ID, pieceId: null, x: 0, y: 0, rotation: 0 }]
    });

    expect(parsed.sinks[0]?.quantity).toBe(1);
    expect(parsed.sinks[0]?.faucetHoleCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/domain/src/quotes/quote-drawing.schemas.test.ts`
Expected: FAIL — both fields `undefined`.

- [ ] **Step 3: Add the fields to the sink schema**

In `quote-drawing.schemas.ts`, change `canvasSinkLayoutSchema` (lines 49-55):

```ts
const canvasSinkLayoutSchema = z.object({
  sinkId: z.string().uuid(),
  pieceId: z.string().uuid().nullable().default(null),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  quantity: z.number().int().positive().default(1),
  faucetHoleCount: z.number().int().min(0).default(0),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/domain/src/quotes/quote-drawing.schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/quotes/quote-drawing.schemas.ts packages/domain/src/quotes/quote-drawing.schemas.test.ts
git commit -m "feat(domain): persist sink quantity and faucet hole count in the layout schema"
```

---

## Task 3: Union square-inch area for a chain shape

**Why:** The save schema requires `segments.min(2)`; an L/U piece is one chain whose segments share corner squares. Summing `lengthIn * widthIn` per segment double-counts the shared corner. The correct area is the area of the union polygon. ADR 0002 makes `chainShapeGeometry` the one geometry source; this adds the area on top of its `outline`.

**Files:**
- Modify: `packages/domain/src/drawing/geometry.ts` (add export near `chainShapeGeometry`, ~line 478)
- Modify: `packages/domain/src/drawing/index.ts` (export)
- Test: `packages/domain/src/drawing/geometry.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `geometry.test.ts`:

```ts
import { chainShapeAreaSqIn } from "./geometry.js";

describe("chainShapeAreaSqIn", () => {
  // scale = 3 px/in (w = lengthIn * 3, h = widthIn * 3)
  it("returns length * width for a single rectangle segment", () => {
    const shape = {
      type: "chain" as const,
      segments: [
        { x: 0, y: 0, w: 300, h: 75, lengthIn: 100, widthIn: 25, orientation: "horizontal" as const },
        { x: 0, y: 0, w: 75, h: 75, lengthIn: 25, widthIn: 25, orientation: "vertical" as const }
      ]
    };
    // Both segments occupy the same 100x25 footprint corner region in this contrived
    // overlap; the union must not exceed the bounding footprint. Use a real L below.
    expect(chainShapeAreaSqIn(shape)).toBeGreaterThan(0);
  });

  it("computes the union area of an L (no double-counted corner)", () => {
    // Horizontal arm 100x25 at (0,0); vertical arm 25x50 hanging below its left end.
    // Union = 100*25 + 25*50 = 2500 + 1250 = 3750 sq in (arms meet, no overlap).
    const shape = {
      type: "chain" as const,
      segments: [
        { x: 0, y: 0, w: 300, h: 75, lengthIn: 100, widthIn: 25, orientation: "horizontal" as const },
        { x: 0, y: 75, w: 75, h: 150, lengthIn: 25, widthIn: 50, orientation: "vertical" as const }
      ]
    };
    expect(chainShapeAreaSqIn(shape)).toBe(3750);
  });

  it("does not double-count an overlapping corner square", () => {
    // Horizontal 100x25 at (0,0); vertical 25x100 at (0,0) overlapping the first 25x25.
    // Union = 100*25 + 25*100 - 25*25 = 2500 + 2500 - 625 = 4375 sq in.
    const shape = {
      type: "chain" as const,
      segments: [
        { x: 0, y: 0, w: 300, h: 75, lengthIn: 100, widthIn: 25, orientation: "horizontal" as const },
        { x: 0, y: 0, w: 75, h: 300, lengthIn: 25, widthIn: 100, orientation: "vertical" as const }
      ]
    };
    expect(chainShapeAreaSqIn(shape)).toBe(4375);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/domain/src/drawing/geometry.test.ts`
Expected: FAIL — `chainShapeAreaSqIn is not a function`.

- [ ] **Step 3: Implement `chainShapeAreaSqIn`**

Add to `geometry.ts` immediately after `chainShapeGeometry` (after line 478). It reuses the existing `rectUnionOutline` (pixel ring) and converts to inches via the scale implied by the first segment (`w / lengthIn`), honoring ADR 0002 Rule 3 (inches are truth — the returned value is inches, pixels never leave this function):

```ts
function polygonAreaPx(points: ReadonlyArray<[number, number]>): number {
  if (points.length < 3) return 0;
  let twiceArea = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i] as [number, number];
    const [x2, y2] = points[(i + 1) % points.length] as [number, number];
    twiceArea += x1 * y2 - x2 * y1;
  }
  return Math.abs(twiceArea) / 2;
}

export function chainShapeAreaSqIn(shape: ChainShapeLayout): number {
  const first = shape.segments[0];
  if (!first || first.lengthIn === 0) return 0;
  const scale = first.w / first.lengthIn; // px per inch
  if (scale === 0) return 0;

  const { rects, outline } = chainShapeGeometry(shape);
  const areaPx =
    outline.length >= 3
      ? polygonAreaPx(outline)
      : rects.reduce((total, rect) => total + rect.w * rect.h, 0);

  return roundDrawingInches(areaPx / (scale * scale));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/domain/src/drawing/geometry.test.ts`
Expected: PASS (3750 and 4375 exact).

- [ ] **Step 5: Export from the drawing barrel**

In `packages/domain/src/drawing/index.ts`, ensure `chainShapeAreaSqIn` is exported (the file re-exports from `geometry.js`; if it uses an explicit list, add `chainShapeAreaSqIn`). Verify:

Run: `node -e "import('@stoneboyz/domain/drawing').then(m => console.log(typeof m.chainShapeAreaSqIn))"` is NOT required — instead just typecheck in Step 6 of Task 4.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/drawing/geometry.ts packages/domain/src/drawing/geometry.test.ts packages/domain/src/drawing/index.ts
git commit -m "feat(domain): compute union square-inch area for chain shapes"
```

---

## Task 4: Use union area in the layout→totals converter

**Files:**
- Modify: `packages/domain/src/quotes/quote-measurements-from-layout.ts`
- Test: `packages/domain/src/quotes/quote-measurements-from-layout.test.ts`

**Context:** Today `pieceDimensions` reads `shape.segments[0]` and the converter feeds `lengthIn`/`widthIn` to `calculateCountertopSqFt`. That is wrong for multi-segment chains and rejects the real schema's `min(2)`. Replace area derivation with `chainShapeAreaSqIn`. The domain `calculateCountertopSqFt(lengthIn, widthIn)` multiplies the two; to feed a precomputed area through it unchanged, pass the area as `lengthIn` and `1` as `widthIn` — OR (preferred) compute the piece sqft directly here. This task uses the direct approach and stops depending on `calculateCountertopSqFt` for pieces, while keeping edge/sink derivation as-is.

- [ ] **Step 1: Write the failing test**

Replace the existing `rectChain` helper in `quote-measurements-from-layout.test.ts` so fixtures are schema-valid (≥2 segments) and add a multi-segment area test. Add this test inside the existing `describe`:

```ts
it('derives countertop square footage from a multi-segment L piece', () => {
  const layout = emptyLayout();
  layout.pieces = [
    {
      pieceId: 'p1', x: 0, y: 0, rotation: 0, kind: 'countertop',
      shape: { type: 'chain', segments: [
        { x: 0, y: 0, w: 300, h: 75, lengthIn: 100, widthIn: 25, orientation: 'horizontal' },
        { x: 0, y: 75, w: 75, h: 150, lengthIn: 25, widthIn: 50, orientation: 'vertical' }
      ] }
    }
  ];

  // union = 3750 sq in / 144 = 26.042 sq ft
  expect(measurementTotalsFromLayout(layout).countertopSqFt).toBe(26.042);
});
```

> Note: the existing single-segment `rectChain(...)` fixtures must be updated to two segments to satisfy the schema-shaped type. For a plain rectangle, append a degenerate second segment that does not change the union (e.g. a zero-extent or coincident segment is invalid because `w/h` must be positive — instead model the rectangle as two abutting halves: a 100×25 rect split into `[0,0,150px,75px → 50×25]` + `[150,0,150px,75px → 50×25]`, union = 100×25). Update each fixture's expected values accordingly, recomputing area as the union.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/domain/src/quotes/quote-measurements-from-layout.test.ts`
Expected: FAIL — converter still reads `segments[0]` only (returns 100*25/144 = 17.361, not 26.042).

- [ ] **Step 3: Rewrite piece area derivation**

In `quote-measurements-from-layout.ts`:
- Import `chainShapeAreaSqIn` from `../drawing/geometry.js`.
- Replace `pieceDimensions` usage for area with a direct sqft per piece. Keep a separate, simple rectangle-side helper for edge length (see Task 5). New piece loop:

```ts
import { chainShapeAreaSqIn } from '../drawing/geometry.js';

const SQUARE_INCHES_PER_SQUARE_FOOT = 144;

function pieceAreaSqFt(piece: CanvasPieceLayout): number {
  const shape = piece.shape;
  if (!shape || shape.type !== 'chain') return 0;
  return Math.round((chainShapeAreaSqIn(shape) / SQUARE_INCHES_PER_SQUARE_FOOT) * 1000) / 1000;
}
```

Then build `countertopSqFt` / `backsplashSqFt` by summing `pieceAreaSqFt` over the relevant `kind`, instead of routing through `calculateMeasurementAreaTotals` for pieces. **Keep** edges and sinks going through the domain assembler (Task 5 handles edge length). Reconcile so the returned object still matches `QuoteMeasurementAreaTotals` exactly (pieceCount, countertopSqFt, backsplashSqFt, combinedSqFt, finishedEdgeLinFt, splashSqFt, sinkCutoutCount, faucetHoleCount).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/domain/src/quotes/quote-measurements-from-layout.test.ts`
Expected: PASS (all, including the 26.042 case).

- [ ] **Step 5: Typecheck the domain package**

Run: `pnpm -C packages/domain typecheck`
Expected: 0 errors. (Confirms Task 3's barrel export resolves.)

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/quotes/quote-measurements-from-layout.ts packages/domain/src/quotes/quote-measurements-from-layout.test.ts
git commit -m "feat(domain): derive piece square footage from the chain union area"
```

---

## Task 5: Lock the rectangle-case edge length and document the multi-segment gap

**Files:**
- Modify: `packages/domain/src/quotes/quote-measurements-from-layout.ts` (comment + guard)
- Test: `packages/domain/src/quotes/quote-measurements-from-layout.test.ts`

**Context:** Finished-edge linear footage is derived from the edge's referenced piece side (`top`/`bottom` → length, else width). This is only well-defined for a single-segment rectangle. The persisted edge schema has no segment index, so multi-segment edge length cannot be derived. This task makes the limitation explicit and tested, rather than silently wrong.

- [ ] **Step 1: Write the test pinning rectangle-case edge length**

The existing finished-edge and splash tests already cover the rectangle case. Add one test asserting that for a multi-segment piece, the converter does not crash and computes edge length from the first segment's side (documented behavior), so the gap is visible:

```ts
it('derives rectangle-case edge length from the referenced side (multi-segment gap documented)', () => {
  const layout = emptyLayout();
  layout.pieces = [
    {
      pieceId: 'p1', x: 0, y: 0, rotation: 0, kind: 'countertop',
      shape: { type: 'chain', segments: [
        { x: 0, y: 0, w: 150, h: 75, lengthIn: 50, widthIn: 25, orientation: 'horizontal' },
        { x: 150, y: 0, w: 150, h: 75, lengthIn: 50, widthIn: 25, orientation: 'horizontal' }
      ] }
    }
  ];
  layout.edges = [
    { pieceId: 'p1', edge: 'top', treatment: 'finished', splashHeightIn: null, label: null }
  ];

  // KNOWN GAP: edge length uses first segment's length (50in), not the full 100in run.
  // Correct multi-segment edge length is deferred to ADR 0003 step 5 (edge-tool reshape).
  expect(measurementTotalsFromLayout(layout).finishedEdgeLinFt).toBe(4.167);
});
```

- [ ] **Step 2: Run test to verify current behavior**

Run: `pnpm vitest run packages/domain/src/quotes/quote-measurements-from-layout.test.ts`
Expected: PASS if the side helper reads the first segment; if it FAILs, adjust the side helper to read `shape.segments[0]` dimensions explicitly and add the documenting comment.

- [ ] **Step 3: Add the documenting comment in the converter**

Above the edge-length helper in `quote-measurements-from-layout.ts`:

```ts
// KNOWN GAP (ADR 0003 step 5): the persisted edge schema keys edges by
// pieceId + top/right/bottom/left with no segment index, so finished-edge
// linear footage is only correct for single-segment (rectangle) pieces. For
// multi-segment chains this reads the first segment's side. Resolved when the
// edge tool is reshaped.
```

- [ ] **Step 4: Run the full quotes domain suite**

Run: `pnpm vitest run packages/domain/src/quotes/`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/quotes/quote-measurements-from-layout.ts packages/domain/src/quotes/quote-measurements-from-layout.test.ts
git commit -m "test(domain): pin rectangle-case edge length, document multi-segment gap"
```

---

## Task 6: Serialize `kind` / sink counts when the canvas saves

**Files:**
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx`

**Context:** The canvas builds the layout payload it POSTs to `.../drawing`. It must include `kind` on each piece and `quantity` / `faucetHoleCount` on each sink, or the schema defaults (countertop / 1 / 0) erase the user's intent. Find where the layout payload is assembled for save (search for the object containing `pieces:` and `sinks:` arrays passed to the save action / fetch).

- [ ] **Step 1: Locate the save serialization**

Run: `grep -n "pieces:\|sinks:\|saveRevision\|drawing'" apps/web/src/app/customers/\[id\]/quotes/\[quoteId\]/DrawingCanvasInner.tsx`
Identify the object literal mapping internal piece/sink state to the POST body.

- [ ] **Step 2: Add `kind` to each serialized piece**

Map the internal piece's kind (the canvas already tracks `kind?: "countertop" | "backsplash"` on its piece type — see the local type near line 327) into the payload:

```ts
// in the pieces map for the save payload
kind: piece.kind ?? "countertop",
```

- [ ] **Step 3: Add `quantity` / `faucetHoleCount` to each serialized sink**

```ts
// in the sinks map for the save payload
quantity: sink.quantity ?? 1,
faucetHoleCount: sink.faucetHoleCount ?? 0,
```

- [ ] **Step 4: Typecheck web**

Run: `pnpm -C apps/web typecheck`
Expected: 0 errors. (The generated `@stoneboyz/api-client` body type may need regeneration only if the OpenAPI drawing-save schema changed — it did not; the layout is validated server-side by Zod, so no client regen is required. If the web build references a domain `CanvasLayout` type for the payload, the new optional fields already exist on it.)

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx"
git commit -m "feat(web): serialize piece kind and sink counts into the saved drawing"
```

---

## Task 7: API — derive area totals from the latest layout (RED via integration test)

**Files:**
- Modify: `tests/integration/quote-measurements.test.ts` (golden scenario → seed via layout)
- Modify: `apps/api/src/quotes/quote-areas.repository.ts`

**Context:** `measurementTotalsForAreas` (private, line 206) currently queries `counter_pieces` / `edge_segments` / `sink_cutouts`. Replace its body to load the latest `drawing_revisions.layout` per area and run `measurementTotalsFromLayout`. The public `pricingMeasurementTotalsForArea` (line 168) is repointed in Task 8. The three read sites (lines 48, 71, 139) call `measurementTotalsForAreas` and need no change.

- [ ] **Step 1: Add a layout-save helper + rewrite the golden test to seed via layout**

In `tests/integration/quote-measurements.test.ts`, add near the other URL helpers:

```ts
const drawingUrl = (quoteId: string, areaId: string, customerId = SEEDED_CUSTOMER_ID): string =>
  `${areasUrl(quoteId, customerId)}/${areaId}/drawing`;

const saveDrawing = async (quoteId: string, areaId: string, layout: unknown): Promise<Response> =>
  fetch(drawingUrl(quoteId, areaId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ layout })
  });

const PIECE_A = '00000000-0000-4000-8000-0000000000a1';
const PIECE_B = '00000000-0000-4000-8000-0000000000a2';
const SINK_A = '00000000-0000-4000-8000-0000000000b1';

const twoSegRect = (lengthIn: number, widthIn: number) => ({
  type: 'chain',
  segments: [
    { x: 0, y: 0, w: (lengthIn / 2) * 3, h: widthIn * 3, lengthIn: lengthIn / 2, widthIn, orientation: 'horizontal' },
    { x: (lengthIn / 2) * 3, y: 0, w: (lengthIn / 2) * 3, h: widthIn * 3, lengthIn: lengthIn / 2, widthIn, orientation: 'horizontal' }
  ]
});
```

Replace the body of the `'returns the expected Kitchen measurement totals on quote detail'` test so it saves a layout instead of POSTing pieces/edges/sinks. Use a finished (non-splash) edge so the rectangle-case finished-edge length is exact:

```ts
it('returns the expected Kitchen measurement totals on quote detail', async () => {
  const { quoteId, areaId } = await createQuoteWithArea({ name: 'Kitchen' });

  const layout = {
    pieces: [
      { pieceId: PIECE_A, x: 0, y: 0, rotation: 0, kind: 'countertop', shape: twoSegRect(100, 25.5) },
      { pieceId: PIECE_B, x: 0, y: 0, rotation: 0, kind: 'countertop', shape: twoSegRect(72, 36) }
    ],
    edges: [
      { pieceId: PIECE_A, edge: 'top', treatment: 'finished' }
    ],
    sinks: [
      { sinkId: SINK_A, pieceId: PIECE_A, x: 0, y: 0, rotation: 0, quantity: 1, faucetHoleCount: 1 }
    ]
  };
  const saved = await saveDrawing(quoteId, areaId, layout);
  expect(saved.status).toBe(201);

  const response = await fetch(`${quotesUrl()}/${quoteId}`);
  const body = await response.json() as Record<string, unknown>;
  const areas = body['areas'] as Array<Record<string, unknown>>;
  const kitchen = areas.find((area) => area['id'] === areaId);

  expect(response.status).toBe(200);
  expect(kitchen?.['measurementTotals']).toEqual({
    pieceCount: 2,
    countertopSqFt: 35.708, // (100*25.5 + 72*36) / 144
    backsplashSqFt: 0,
    combinedSqFt: 35.708,
    finishedEdgeLinFt: 4.167, // edge 'top' on PIECE_A first segment = 50in / 12 (multi-segment gap)
    splashSqFt: 0,
    sinkCutoutCount: 1,
    faucetHoleCount: 1
  });
});
```

> The `finishedEdgeLinFt` here reflects the documented multi-segment gap (first-segment side). If, after Task 5, the executor chose to read the full first-piece side differently, recompute this expected value to match the converter — do not change the converter to satisfy a guessed number.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/integration/quote-measurements.test.ts -t 'Kitchen measurement totals'`
Expected: FAIL — totals come from empty `counter_pieces` (0s), because the repo still reads the normalized tables.

- [ ] **Step 3: Rewrite `measurementTotalsForAreas` to read the latest layout**

Replace the body of `measurementTotalsForAreas` (line 206+) in `quote-areas.repository.ts`:

```ts
import { measurementTotalsFromLayout } from '@stoneboyz/domain';
import type { CanvasLayout } from '@stoneboyz/domain';

private async measurementTotalsForAreas(rows: QuoteAreaRow[]): Promise<Map<string, QuoteMeasurementAreaTotals>> {
  const totals = new Map<string, QuoteMeasurementAreaTotals>();
  const areaIds = rows.map((row) => row.id);
  if (areaIds.length === 0) return totals;

  const layouts = await this.pool.query<{ quote_area_id: string; layout: CanvasLayout | string }>(
    `SELECT DISTINCT ON (quote_area_id) quote_area_id, layout
       FROM drawing_revisions
      WHERE quote_area_id = ANY($1::uuid[])
      ORDER BY quote_area_id, revision_number DESC`,
    [areaIds]
  );

  for (const row of layouts.rows) {
    const layout = (typeof row.layout === 'string' ? JSON.parse(row.layout) : row.layout) as CanvasLayout;
    totals.set(row.quote_area_id, measurementTotalsFromLayout(layout));
  }

  return totals;
}
```

Areas with no drawing revision are simply absent from the map; `mapQuoteAreaRow` already falls back to `emptyMeasurementTotals()`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/integration/quote-measurements.test.ts -t 'Kitchen measurement totals'`
Expected: PASS.

- [ ] **Step 5: Run the whole measurements integration file**

Run: `pnpm vitest run tests/integration/quote-measurements.test.ts`
Expected: PASS — the CRUD/validation/404/cascade tests are unaffected (they exercise the still-present forms, not totals).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/quotes/quote-areas.repository.ts tests/integration/quote-measurements.test.ts
git commit -m "feat(api): derive Sheet measurement totals from the latest drawing layout"
```

---

## Task 8: Repoint pricing at the layout, delete the duplicated SQL

**Files:**
- Modify: `apps/api/src/quotes/quote-pricing.service.ts:51`
- Modify: `apps/api/src/quotes/quote-areas.repository.ts` (delete `pricingMeasurementTotalsForArea` SQL body; add a thin layout-backed method)
- Modify: `tests/integration/quote-pricing.test.ts` (seed via layout)

- [ ] **Step 1: Reseed the pricing test via layout**

In `tests/integration/quote-pricing.test.ts`, replace the piece/edge/sink seeding (around lines 148-168) with a `saveDrawing` call mirroring Task 7's helper (copy the `drawingUrl` / `saveDrawing` / `twoSegRect` helpers and UUID constants into this file). Recompute any asserted price-line quantities from the layout-derived totals (material = countertop sqft, fabrication/edge = finished-edge linft).

- [ ] **Step 2: Run the pricing test to verify it fails**

Run: `pnpm vitest run tests/integration/quote-pricing.test.ts`
Expected: FAIL — pricing still reads `pricingMeasurementTotalsForArea` over empty tables.

- [ ] **Step 3: Replace `pricingMeasurementTotalsForArea` with a layout-backed method**

In `quote-areas.repository.ts`, delete the SQL body of `pricingMeasurementTotalsForArea` (lines 168-205) and make it reuse the layout path:

```ts
async pricingMeasurementTotalsForArea(areaId: string): Promise<QuoteMeasurementAreaTotals> {
  const totals = await this.measurementTotalsForAreas([{ id: areaId } as QuoteAreaRow]);
  return totals.get(areaId) ?? emptyMeasurementTotalsValue();
}
```

Add an exported `emptyMeasurementTotalsValue()` helper (or import the mapper's empty), so a layout-less area prices to zeros. The pricing service call site (`quote-pricing.service.ts:51`) is unchanged.

- [ ] **Step 4: Delete now-dead SQL row mapping for totals**

Remove any imports / row types used **only** by the deleted totals SQL (verify with grep that `CounterPieceRow` etc. are still used by the CRUD methods before deleting — they are, so keep them; only remove genuinely unreferenced symbols). Run `pnpm -C apps/api typecheck` and remove whatever it flags as unused.

- [ ] **Step 5: Run the pricing test to verify it passes**

Run: `pnpm vitest run tests/integration/quote-pricing.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/quotes/quote-areas.repository.ts apps/api/src/quotes/quote-pricing.service.ts tests/integration/quote-pricing.test.ts
git commit -m "feat(api): price Sheets from layout-derived totals, delete duplicated totals SQL"
```

---

## Task 9: Web — delete the narrow totals type, use the API contract

**Files:**
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/MeasurementsCard.tsx:27` (and the local `emptyMeasurementTotals` at line 99, `TotalsGrid` at 180)

**Context:** OpenAPI already declares the full `QuoteMeasurementAreaTotals` (`backsplashSqFt` + `combinedSqFt` included, openapi.yaml:1347). The local narrow type at line 27 drops them. Replace it with the generated type and surface the two restored fields in `TotalsGrid`.

- [ ] **Step 1: Replace the local type with the generated one**

```ts
type QuoteMeasurementAreaTotals = components['schemas']['QuoteMeasurementAreaTotals'];
```

Delete the hand-written object type (lines 27-34). Update the local `emptyMeasurementTotals` (line 99) to include `backsplashSqFt: 0` and `combinedSqFt: 0`.

- [ ] **Step 2: Show the restored fields in `TotalsGrid`**

In `TotalsGrid` (line 180), add cells for `backsplashSqFt` and `combinedSqFt` alongside `countertopSqFt`, matching the existing cell markup.

- [ ] **Step 3: Typecheck web**

Run: `pnpm -C apps/web typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/customers/[id]/quotes/[quoteId]/MeasurementsCard.tsx"
git commit -m "feat(web): consume the full measurement totals contract (backsplash + combined)"
```

---

## Task 10: Full verification

- [ ] **Step 1: Typecheck the whole repo**

Run: `pnpm -w run typecheck` (or per-package: `pnpm -C packages/domain typecheck && pnpm -C apps/api typecheck && pnpm -C apps/web typecheck`)
Expected: 0 errors.

- [ ] **Step 2: Run the full test suite**

Run: `pnpm -w run test`
Expected: all green. Investigate any pricing/measurement integration failures against the layout-derived totals — fix expected values to match the converter, never weaken the converter to match a guess.

- [ ] **Step 3: Final commit (if any cleanup landed)**

```bash
git add -A
git commit -m "chore: verify drawing-derived measurement read path is green"
```

---

## Self-Review Notes

- **Spec coverage:** Blockers #1 (kind) → Task 1; #2 (sink counts) → Task 2; #3 (union area) → Tasks 3–4; read-path cut (ADR 0003 step 3) → Tasks 7–9. Multi-segment edge length explicitly deferred (Task 5) — this is the one spec area intentionally not solved, with a tracked reason.
- **Type consistency:** `measurementTotalsFromLayout`, `CanvasLayout`, `QuoteMeasurementAreaTotals`, `chainShapeAreaSqIn` are the names used throughout. `quote_area_id` / `revision_number` match the DB columns (`db/migrations/024_create_drawing_revisions.sql`).
- **Open risk:** the schema still carries dead `l` / `z` shape branches (ADR 0002 said to remove them but they remain). `chainShapeAreaSqIn` only handles `chain`; pieces with `l`/`z` shapes return 0 area. If real data still has `l`/`z` records, add a migration to convert them to chains (ADR 0002 step 3) — out of scope here, flagged.
```
