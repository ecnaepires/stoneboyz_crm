# ADR 0002 — Drawing Geometry Core Redesign

**Status:** Accepted  
**Date:** 2026-05-28  
**Deciders:** Owner

---

## Context

The drawing module (embedded in quotes) accumulates bugs that never fully close:

| Symptom | Root cause |
|---|---|
| Backsplash snaps to piece boundary, not to offset line | Snapping reads boundary edges; offset lives in `referenceLines` — two separate systems |
| Pieces with legacy `type: "l"` or `type: "z"` shapes fail to render | Per-shape branches in schema; `geometry.ts` only has functions for `chain` |
| Color and extend break after certain edits | No shared edge model — each tool reads its own slice; one change drifts the others |
| Measurements drift | Dual source of truth: typed inches vs pixel-derived inches (`/ scale`) |

These are not five bugs. They are one disease: **no single canonical piece model that all features share.**

---

## Decision

Redesign the geometry core to a **single canonical chain model** shared by all tools.

### Rule 1 — Chain is the only shape type

`LShapeLayout` and `ZShapeLayout` are retired. All pieces are `ChainShapeLayout` (rect-union chain). L, Z, U shapes are just chains with 2, 3, and 4+ segments. Old DB records with `type: "l"` or `type: "z"` are migrated to equivalent chains.

### Rule 2 — One edge system

Counter edges, offset edges, and wall reference lines are all `DrawingShapeEdge` values derived from the canonical chain geometry. No separate "boundary edge" vs "reference line" split for snapping purposes. Snapping operates on edges derived from the current chain geometry.

### Rule 3 — Inches are truth, pixels are display

All geometry is stored and computed in inches (1/16 precision via `roundDrawingInches`). Pixel coordinates exist only in the render layer. No pixel arithmetic leaks into domain functions.

### Rule 4 — All tools share one edge derivation

`chainShapeGeometry(shape)` → `{ rects, outline, edges }` is the single function all tools call to get renderable edges. No tool re-derives edges independently.

---

## Consequences

- `canvasPieceShapeSchema` removes `"l"` and `"z"` discriminated union branches.
- `PieceShape` type = `ChainShapeLayout` only.
- DB migration converts any stored `type: "l"` / `type: "z"` records to equivalent chain segments.
- `backsplashCornerCandidatesForEdges` sources its candidates exclusively from chain-derived edges, not from `referenceLines`.
- Extend, color, and snap all operate on the same edge set.
- Angled walls (future) = one vertex move on the chain polygon — no new branch needed.

---

## De-risk Path

Big-bang rewrites fail. Execute in this order:

1. **Regression catalog** — catalog real failures as failing tests (see `docs/drawing-regression-catalog.md`). These become the pass/fail gate.
2. **PoC** (Phase 1) — prove canonical model kills backsplash snap bug on one hard case. Go/no-go gate before full port.
3. **Schema migration** — retire `l`/`z` branches, migrate DB records.
4. **Port geometry engine** — all tools pass regression suite.
5. **Standalone product** (Phase 2+) — extract geometry engine to its own package; wire drawing as a first-class route (`/drawings`), separate from quotes.

---

## Alternatives Rejected

**Keep patching** — each patch fixes one symptom but the per-shape branches and dual source of truth regenerate new failures. Weeks-per-fix rate cannot converge.

**Full blank rewrite** — discards working chain geometry and rect-union logic that is correct and tested. Too much risk.
