# ADR 0007 — Polygon Edge and Corner Treatments Key by Stable Vertex Identity

**Status:** Accepted — Rule 2 superseded for layout schema v2 by ADR 0011; all
other rules stand
**Date:** 2026-06-08
**Deciders:** Owner
**Builds on:** ADR 0006 (piece outline is the single source of truth), ADR 0002 (geometry core)

---

## Context

ADR 0006 Rule 3 decided that an edge is the segment between two adjacent
vertices and carries its own treatment, replacing the four named sides
(`top/right/bottom/left`). It decided *that* treatments move to per-edge, but not
*how* a treatment stays attached to the correct edge as the user edits the shape —
extends a run, drags a vertex, or inserts a vertex to draw a notch or an angled
run.

This representation question is now blocking, because angled-piece authoring (the
polygon editor) is about to be built on top of whatever this contract is. If the
contract is wrong, the editor and the geometry core drift, and saved quotes carry
treatments on the wrong edges.

Three keying options exist, and the choice is hard to reverse because it is
persisted on every saved quote:

| Option | Failure mode |
|---|---|
| Positional edge index `0..N-1` | Inserting a vertex (notch, angle) shifts every higher index → treatments slide onto the wrong edges. This is the RC-04 bug class. |
| `from/to` pixel coordinates | Drift on move/scale; a moved edge loses its treatment. RC-05 already warns against pixel-derived values. |
| Stable vertex identity | Survives reindexing and movement. Chosen. |

A second, smaller problem: `EdgeLayout` is currently defined in
`packages/domain/src/drawing/types.ts` *and* redefined locally in
`apps/web/.../DrawingCanvasInner.tsx` (~L431). Two definitions of the same
persisted shape is a drift hazard.

---

## Decision

Edge and corner treatments key by **stable vertex identity**, never by positional
index or coordinates. Positional index is a derived, render-time lookup only —
never persisted.

### Rule 1 — Vertices carry a stable id

`PolygonVertex` gains an `id: string`. An id is assigned when the vertex is
created and preserved across every edit (extend, drag, split, merge). Ids are
never reused. `polygon.ts` area and `polygonEdges` are functionally unchanged;
`polygonEdges` carries the endpoint ids alongside `from`/`to`/`lengthIn`.

### Rule 2 — Edge treatment keys by the ordered vertex-id pair

An edge treatment (finished / splash / mitered / waterfall / appliance /
unfinished) is keyed by `{ fromVertexId, toVertexId }` — the edge's identity, the
ordered pair of its endpoint vertices. `EdgeLayout` stores that pair, not
`edge: "top"|"right"|"bottom"|"left"` and not a numeric index.

### Rule 3 — Corner treatment keys by vertex id

A corner treatment (Radius / Clip per ADR 0006 Rule 4) is keyed by `vertexId`,
not by the four named corners.

### Rule 4 — Edits preserve identity deterministically

- **Extend** (lengthen a run): the edge keeps its endpoint ids; the vertex moves.
  Treatment stays. (RC-04.)
- **Split** (insert a vertex to draw a notch or angled run): the original edge
  becomes two child edges; both inherit the parent's treatment. Per-child
  override is explicit afterward.
- **Merge** (remove a vertex): if the two merged edges had different treatments,
  the result is ambiguous → the merge requires an explicit treatment choice; it
  never silently picks one.

### Rule 5 — One definition of the persisted shape

`EdgeLayout` and `CornerLayout` are defined once, in `packages/domain`. The canvas
imports them. The local redefinition in `DrawingCanvasInner.tsx` is removed.

### Rule 6 — Legacy data normalizes on load, no migration

On load, a stored chain/L/Z revision is converted to a polygon (existing
`chainToPolygon`), each vertex is assigned a stable id, and any treatment stored
against an old named side is mapped to the vertex-id pair of the matching
bounding-box boundary edge via `mapLegacyEdgeToPolygonIndex` (extended to resolve
to identity, not a raw index). Consistent with ADR 0006: normalize-on-load, no
data migration.

---

## Consequences

- `PolygonVertex` shape changes from `{ x, y }` to `{ id, x, y }`. Every producer
  of a polygon (the converters, the editor) assigns ids; every consumer that keyed
  on index or coordinates switches to identity.
- `EdgeLayout.edge` and `CornerLayout.corner` (named-side/named-corner) become
  vertex-id references. This is the concrete form of ADR 0006 Rule 3.
- `mapLegacyEdgeToPolygonIndex` resolves a legacy side to an edge *identity*; its
  name is now slightly misleading but kept to avoid churn — note this in the code.
- **This contract is frozen once accepted.** The polygon editor (canvas authoring)
  and the geometry core build against it in parallel; reshaping it mid-flight
  breaks both. Changes require a follow-up ADR.
- `DrawingChainVisibleEdge` and `DrawingBacksplashCornerSnap` resolve edges/corners
  through identity, so backsplash snapping (RC-01) and visible-edge logic survive
  vertex insertion.

---

## Alternatives Rejected

**Positional edge index (`edgeIndex: number`)** — simplest to store, but indices
shift the moment a vertex is inserted or removed, sliding every treatment past the
edit point onto the wrong edge. Reintroduces the exact RC-04 failure. Rejected.

**`from/to` coordinate keying** — an edge identified by its endpoint coordinates
loses its treatment as soon as the edge is moved or the canvas is rescaled. RC-05
already establishes that persisted meaning must not be pixel-derived. Rejected.

**Leave it to the implementation** — the keying choice is persisted on every quote
and shared by two agents building in parallel; an undocumented choice guarantees
drift. Rejected in favor of pinning it here.
