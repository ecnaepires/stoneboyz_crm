# Drawing Breakage Log

Live capture from drawing on the real canvas. Goal: make "works right" **finite**.
Every row here becomes one failing pure test (named `BR-NN`), then a fix to green —
the same red→green loop as `drawing-regression-catalog.md`. When this log is empty
of open rows, the drawing workspace is done.

## How to log (do this while you draw, don't polish it)

For each thing that breaks, jot a row. Rough is fine — I'll sharpen it into a test.
The two things I most need: **the exact steps** (which tool, in what order) and
**what you expected vs. what you saw**.

## The disease (so we name breakages consistently)

Most "nitty-picky" breakages are one invariant violated in a new place:

- **Single-Outline Fidelity (Track A — geometry):** outline, fill, dimensions, and
  hit-testing all read the *same stored vertex ring*. Nothing re-derives a bounding
  box or hull. Symptoms: a U fills as a square, fill paints the bounding box, the
  bottom dimension also shows on top.
- **Operation Closure (Track A — geometry):** every edit (offset, fillet/connect,
  delete-line, extend, backsplash) leaves a *valid* shape — closed, non-self-
  intersecting, treatments still on the right edges by identity. No op corrupts the
  piece for the next tool.
- **Overlay Separation (Track B — visual):** correct geometry, but overlays collide
  on screen — a dimension label over the piece label, a legend over an edge, color
  fill bleeding under a splash marker. Readable, non-overlapping, sane z-order.

## Open breakages

| ID | Sheet & shape drawn | Exact steps (tool order) | Expected | Actual (what broke) | Track | Status |
|----|--------------------|--------------------------|----------|--------------------|-------|--------|
| _None_ | | | | | | |

## Fixed (moved here once the BR-NN test is green)

| ID | One-line summary | Test file | Commit |
|----|-----------------|-----------|--------|
| BR-01 | Rounded/radius pieces remain selectable after zoom; the rounded piece body listens for pointer events. | `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts` | pending |
| BR-02 | Toolbar/hotkey zoom focuses selected piece or viewport center; wheel zoom anchors under the cursor. | `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts` | pending |
| BR-03 | Offset-created green reference outlines render at the same thin default stroke weight as regular piece outlines. | `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts` | pending |
| BR-04 | Cabinet reference lines stay straight when radius visuals are applied to matching wall/outline offset lines. | `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawingGeometry.test.ts` | pending |
| BR-05 | Radius corner net finished area uses real-inch tangent setback math while billable/pricing square footage remains unchanged. | `packages/domain/src/quotes/quote-measurements-from-layout.test.ts` | pending |
