# Drawing Geometry — Regression Catalog

These are the known failure cases that the redesigned geometry core must pass.  
Each entry = one failing test to write before touching the engine (red), then make green.

---

## RC-01 — Backsplash snaps to offset line, not boundary edge

**Bug:** When a piece has a wall offset (cabinet overhang), placing a backsplash snaps to the piece's inner boundary edge instead of the offset (wall) line endpoint.

**Expected:** `backsplashCornerCandidatesForEdges` returns candidates whose `x/y` match the offset line endpoints, not the boundary edge endpoints.

**Test shape:**
- Chain piece: one horizontal segment, 96 in × 25.5 in at origin.
- Wall offset: 2 in inward from top edge → offset line at `y = 6` (px, scale 3).
- Boundary top edge at `y = 0`.
- Call `backsplashCornerCandidatesForEdges` with this piece + offset reference line.
- Assert: returned candidates include points at the offset line's endpoints (`y ≈ 6`), not only at `y = 0`.

**File:** `packages/domain/src/drawing/geometry.test.ts`

---

## RC-02 — Legacy `type: "l"` shape renders without crash

**Bug:** A `PieceLayout` with `shape.type === "l"` (old `LShapeLayout`) passed to rendering code causes a crash or silent no-op because `chainShapeGeometry` only accepts `ChainShapeLayout`.

**Expected:** Either (a) schema migration converts all `"l"` records to equivalent chains before they reach render, or (b) a conversion function `legacyShapeToChain(shape)` exists and is called at the boundary.

**Test:**
- Construct a `PieceLayout` with `shape: { type: "l", legX: 0, legY: 0, legWidthIn: 25.5, legLengthIn: 60 }`.
- Pass through `legacyShapeToChain`.
- Assert result is a valid `ChainShapeLayout` with correct segment dimensions.
- Assert `chainShapeGeometry(result).edges.length > 0`.

**File:** `packages/domain/src/drawing/geometry.test.ts`

---

## RC-03 — Legacy `type: "z"` shape renders without crash

Same as RC-02 but for `ZShapeLayout` (two horizontal legs + one connecting vertical).

**Test:**
- Input: `{ type: "z", legX: 0, legY: 0, legWidthIn: 25.5, legLengthIn: 60, tailX: 0, tailY: 100, tailLengthIn: 60, tailWidthIn: 25.5 }`.
- `legacyShapeToChain` → valid 3-segment `ChainShapeLayout`.
- `chainShapeGeometry(result).edges.length === 8`.

**File:** `packages/domain/src/drawing/geometry.test.ts`

---

## RC-04 — Edge color assignment survives extend

**Bug:** After extending a chain segment, the edge treatment (finished/wall/splash) assigned to the extended edge resets or applies to the wrong edge key.

**Expected:** Edge treatments are keyed by edge identity (from/to coords or segment index + side), not by stale pixel coords. After extend, the same physical edge retains its treatment.

**Test:**
- Chain piece: horizontal segment 60 in × 25.5 in.
- Assign `"finished"` treatment to top edge.
- Extend right end by 12 in → new segment 72 in × 25.5 in.
- Assert top edge of extended segment still has `"finished"` treatment.
- Assert no other edge gained `"finished"` treatment.

**File:** `packages/domain/src/drawing/geometry.test.ts`

---

## RC-05 — Measurement shows typed inches, not pixel-derived inches

**Bug:** Dimension labels show pixel-derived values that drift from the typed inch values when scale ≠ 3 or after certain edits.

**Expected:** `segment.lengthIn` and `segment.widthIn` are the canonical values. Dimension labels always read from `lengthIn`/`widthIn`, never from `segment.w / scale` at render time.

**Test (unit):**
- Create chain segment: `{ w: 288, h: 76.5, lengthIn: 96, widthIn: 25.5, ... }`.
- Render label = `segment.lengthIn` → `96`.
- Mutate `w` to `289` (pixel drift simulation).
- Render label still = `segment.lengthIn` → `96`.
- Assert label !== `segment.w / 3`.

**File:** `packages/domain/src/drawing/geometry.test.ts`

---

## RC-06 — `extend` on offset piece does not collapse reference line

**Bug:** Using extend on a piece that has an offset reference line collapses or removes the reference line.

**Expected:** Extend only modifies segment geometry. Reference lines attached to the piece are preserved unchanged after extend.

**Test:**
- Chain piece with one reference line (offset, `kind: "cabinet"`, dashed).
- Call extend logic on one segment edge.
- Assert reference line still present with original `from`/`to` after extend.

**File:** `packages/domain/src/drawing/geometry.test.ts`

---

## How to use this catalog

1. Write each test in red (failing) against the **current** code.
2. Commit the red tests.
3. Implement the fix / redesign.
4. All six must be green before declaring Phase 1 complete.
5. Add new cases here whenever a bug is reproduced.
