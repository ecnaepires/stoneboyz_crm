# ADR 0010 — Drawing v2: Corner Treatments Are Outline Geometry, Measured Exactly

**Status:** Accepted
**Date:** 2026-06-11
**Deciders:** Owner (decision locked in the Drawing Canvas v2 spec review, 2026-06-11)
**Builds on:** ADR 0002 (geometry core), ADR 0006 (outline is the single source of truth)
**Supersedes:** ADR 0006 Rule 4; amends the corner-treatment sentence of ADR 0006 Rule 1

---

## Context

ADR 0006 unified billing and cut-fit on one outline polygon, but kept Radius/Clip
corner treatments as annotations (Rule 4): "fabrication notes that never change
area or edge length." That was the right call **for the v1 chain model**, which
had no arc representation — making corners geometric would have required arc
support the model didn't have, so a treatment could only ever be a label.

Two things changed:

1. **The annotation approach was proven to be a bug factory.** The 2026-06-11
   drawing-workspace audit (handoff `/tmp/handoff-drawing-workspace-2026-06-11.md`,
   memory `drawing-workspace-bugs`) traced "fillet radius bows toward the inside
   cabinet line" to exactly this: when a corner treatment is not geometry, its
   rendering must *guess* orientation from non-canonical inputs (bounding boxes,
   reference lines). A treatment that is part of the outline cannot point the
   wrong way — outwardness is derived from winding.
2. **Drawing Canvas v2 has first-class arcs.** The v2 spec
   (`docs/specs/modules/drawing-canvas.md`, pre-made decisions table) stores
   radius/chamfer (outward and inward/cove) as vertex properties and DXF-style
   bulges on edges; the kernel (`resolveOutline`) expands them into the exact
   finished boundary used by render, measure, and hit-testing.

This collides with three documents written against the v1 model: ADR 0006 Rule 4,
the CONTEXT.md "Corner Treatment" glossary entry, and the AGENTS.md core rule "do
not automatically subtract radius corners, chamfers … from billable area unless
shop settings enable that behavior." This ADR resolves the collision.

---

## Decision

### Rule 1 — Corner treatments are outline properties

Radius (outward, and inward/cove) and chamfer are stored on the vertex
(`corner: { type, valueIn, direction }`). The kernel expands them into the true
finished boundary. The drawing the customer signs shows the actual cut shape —
the same shape Slab Layout cut-fit and any future DXF export will consume. This
is ADR 0006's own thesis ("never a second shape for the same piece") carried to
its conclusion.

### Rule 2 — Measurement is exact

`outlineAreaSqIn` and `edgeLengthsIn` measure the resolved outline: a 2" outward
radius removes `r² − πr²/4` (≈ 0.86 sq in), a 2" cove removes `πr²/4`, a 2"
chamfer removes `a·b/2`; arc edges contribute `R·θ` to length. Golden tests in
`packages/domain/src/drawing/v2/measure-outline.test.ts` pin these numbers.

### Rule 3 — Measurement is not billing policy

`measureLayout` reports geometric truth (net area of the finished boundary).
Billable-area policy — round-up, minimums, a gross-vs-net election — remains
deferred to the shop-settings spec, exactly as the v2 spec's "Sq ft contract"
row states. Until that spec exists, billed = measured, which is the same default
ADR 0006 set ("billed square footage is the exact outline area," no toggles).
Sink/faucet/pole **cutouts still never subtract** — ADR 0006 Rule 1 stands
unchanged for cutouts; they are counted as units and charged separately.

### Rule 4 — Magnitude and the real consumer

A 2" radius is 0.86 sq in ≈ 0.006 sq ft — quoting impact is negligible. The
exactness exists for the *second* consumer ADR 0006 named: cut-fit. A cut
program fed an outline with phantom square corners wastes the kerf planning the
treatment was supposed to inform.

---

## Consequences

- ADR 0006 Rule 4 is superseded; the sentence "Radius and Clip corner treatments
  do not reduce area or edge length either" in Rule 1 no longer applies to
  drawing v2. The rest of ADR 0006 (outline single-source, true polygons,
  per-segment edges, validation at the boundary) is unchanged and is the
  foundation v2 builds on.
- CONTEXT.md "Corner Treatment" glossary entry is updated alongside this ADR.
- AGENTS.md core rules are updated: the no-auto-subtract rule now scopes to
  *billable adjustments* (shop-configurable, deferred), not to geometric
  measurement.
- ADR 0007 Rule 3 (corner treatment keys by vertex id) is unaffected — v2 stores
  the treatment **on** the vertex, the strongest form of that rule.
- If a shop later wants "bill gross, cut net," `measureLayout` grows
  gross/net/billable fields per the shop-settings spec; the kernel already
  provides both shapes (`resolveOutline` with and without corner expansion).
- The legacy `drawing/` (v1) files keep ADR 0006 Rule 4 behavior until cut-over
  deletes them; no v1 data is migrated (v2 wipes dev drawings).

---

## Alternatives Rejected

**Keep corners as annotations (ADR 0006 Rule 4 as written)** — recreates the
proven fillet-orientation bug class, makes the signed drawing not match the cut
shape, and forces cut-fit onto a second shape — violating ADR 0006's own core
rule. Rejected.

**Subtract only in billing, behind a shop toggle** — the countertop-measuring
skill's full shop-settings block. ADR 0006 already rejected billing toggles as
premature; with geometry exact and billing policy deferred, there is nothing to
toggle yet. Rejected (revisit in the shop-settings spec).
