# ADR 0006 — Piece Outline Is the Single Source of Truth for Billing and Cut-Fit

**Status:** Accepted
**Date:** 2026-06-06
**Deciders:** Owner
**Builds on:** ADR 0002 (drawing geometry core redesign)

---

## Context

An audit of the countertop measurement code against the `countertop-measuring`
domain rules found the drawing produces geometry that is good enough to *quote*
but not to *cut*. Two consumers want piece geometry — quote square footage today,
Slab Layout cut-fit (glossary-only, not yet built) tomorrow — and they were on a
path to disagree:

| Symptom | Root cause |
|---|---|
| Manual pieces billed by bounding rectangle, drawn pieces billed by exact union | Two measurement paths, two definitions of "area" |
| `notch` / `bumpOut` corner treatments render a label but change no geometry, area, or edge length | Dead enum values; real shape changes only come from chain rects |
| L/U sides over-report finished-edge linear footage | Edge linear footage keyed to `top/right/bottom/left` bounding box, not per edge (also noted in ADR 0003 step 5) |
| Angled / non-90° edges cannot be represented | `ChainShapeSegment` is an axis-aligned rect (`x,y,w,h`), not a free vertex |
| Self-intersecting / zero-area shapes silently measure as `0` | `chainShapeAreaSqIn` only guards `<3 points` |

This is one disease, same as ADR 0002 framed it: features drift because they do
not share one canonical geometry. ADR 0002 unified the *shape model* (chain).
This ADR unifies what that geometry *means* for measurement, and generalizes it
from axis-aligned rects to true polygons.

---

## Decision

The piece **outline** — the closed polygon a user draws — is the single source
of truth for both billing and cut-fit. There is never a second shape for the same
piece.

### Rule 1 — Outline area is billed; cutouts are counted, never subtracted

Square footage is the exact outline (union) area of the piece, not its bounding
box. For an L or U the empty corner is not billed. Sink and faucet cutouts do not
reduce square footage — they are counted as units and charged separately. Radius
and Clip corner treatments do not reduce area or edge length either.

### Rule 2 — The geometry model is a true polygon

Generalize the chain from axis-aligned rects to arbitrary vertices. Angled front
runs, clipped island corners, and angled peninsulas are first-class. The shoelace
area function is already polygon-ready; the model, outline builder, edge tool,
snapping, and dimension labels become angled-aware.

### Rule 3 — Edges are per-segment (vertex pairs)

An edge is the segment between two adjacent vertices, carrying its own treatment
(wall vs finished) and its own exact length. This replaces the four named sides
(`top/right/bottom/left`). Every edge — including each leg of an L or U and any
angled run — is measured exactly. This is the fix for the linear-footage
over-report.

### Rule 4 — Corner treatments are annotations only

The only corner treatments are Radius and Clip (chamfer); both are fabrication
notes that never change area or edge length. Notch and Bump-Out are not corner
treatments — they are drawn into the outline as geometry and measured like any
other part of the shape. The `notch` and `bumpOut` corner-treatment enum values
and their UI controls are removed.

### Rule 5 — Invalid polygons are rejected at the domain boundary

A polygon must have ≥3 points, be closed, have area > 0, and not self-intersect.
Invalid geometry is rejected with a clear error and never saved or measured. This
replaces the silent `return 0`. Self-intersection was unlikely with rect-chains
but is a real hazard once polygons are freehand.

---

## Consequences

- The manual measurement path (`lengthIn × widthIn`) and the drawing path must
  agree on outline-union area; the bounding-box path is retired for non-rect pieces.
- `EdgeLayout.edge: "top"|"right"|"bottom"|"left"` becomes a per-segment edge
  reference; `DrawingCornerTreatment` drops `notch` and `bumpOut`.
- `chainShapeAreaSqIn` gains validation and stops returning `0` for bad input.
- Slab Layout (when built) consumes the same outline geometry — cut-fit and
  billing can never use different shapes for the same piece.
- No shop pricing-policy settings (round-up, minimum sqft) are introduced; billed
  square footage is the exact outline area. Added later, on demand, at the Price
  Item / Price Group level.

---

## Alternatives Rejected

**Bill by bounding box** — over-bills L/U pieces by the empty corner and forces
cut-fit and billing onto different shapes. Rejected for the exact outline.

**Keep axis-aligned rect chains only** — smaller scope, but cannot represent
angled edges, which the owner wants as first-class now.

**Shop-configurable billing area and deduction toggles** — the skill's full
shop-settings block. Unnecessary: the decisions above fix cutouts/radius/clip as
never-subtract and notch/bump as always-drawn, leaving nothing to toggle.
