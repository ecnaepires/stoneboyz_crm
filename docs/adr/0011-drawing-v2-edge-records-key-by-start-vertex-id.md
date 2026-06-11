# ADR 0011 — Drawing v2: Edge Records Key by Start Vertex Id

**Status:** Accepted
**Date:** 2026-06-11
**Deciders:** Owner (decision locked in the Drawing Canvas v2 spec review, 2026-06-11)
**Builds on:** ADR 0007 (stable vertex identity) — this is the follow-up ADR its
freeze clause requires
**Supersedes:** ADR 0007 Rule 2, for layout schema v2 only

---

## Context

ADR 0007 Rule 2 keyed an edge treatment by the **ordered vertex-id pair**
`{ fromVertexId, toVertexId }` and froze the contract: "Changes require a
follow-up ADR." This is that ADR.

The v2 layout schema (`schemaVersion: 2`, `docs/specs/modules/drawing-canvas.md`)
defines a piece outline as a **closed clockwise ring** of vertices with stable
ids. In a ring, the edge leaving vertex `v` is uniquely `v → next(v)`: the `to`
component of the pair is derivable from the outline, not independent
information.

Storing the derivable half is not just redundant — it creates a corruptible
invariant. After a vertex insert, merge, or seam split, a stored pair can name
two vertices that are **no longer adjacent**: a dangling reference that needs
detection and repair logic, and that silently mis-keys a treatment if the repair
is wrong. A single `startVertexId` cannot desynchronize: either the start vertex
exists (the record means its outgoing edge) or it does not (the record is
dropped in referential cleanup).

ADR 0007's actual enemy — positional indices and coordinate keying (the RC-04/
RC-05 bug classes) — is untouched by this change: keying is still by stable
vertex identity.

---

## Decision

### Rule 1 — `EdgeRecordV2` keys by `startVertexId` alone

An edge record (paint color, splash) on piece `p` keys the edge from the vertex
with that id to the next vertex in `p`'s clockwise outline. Never a positional
index, never coordinates — ADR 0007 Rules 1 and 3 remain fully in force.

### Rule 2 — Edit semantics preserve ADR 0007 Rule 4 outcomes

- **Extend / drag:** the start vertex moves; the key, and therefore the
  treatment, stays. (RC-04.)
- **Split** (insert vertex `W` on edge `A → B`): the record keyed `A` now covers
  `A → W`; the new child `W → B` inherits a copy of `A`'s record. Per-child
  override is explicit afterward.
- **Merge** (remove a vertex): if the two merged edges carried different
  records, the merge requires an explicit choice; it never silently picks one.

### Rule 3 — Scope

This rule governs layout schema v2 (`EdgeRecordV2` in
`packages/domain/src/drawing/v2/types.ts`). ADR 0007 Rule 2 continues to govern
the legacy v1 polygon types until cut-over deletes them. ADR 0007 Rule 6
(normalize legacy data on load) is moot for v2: the loader rejects v1 layouts
with a "redraw" notice — no pair-keyed records are ever migrated into v2.

---

## Consequences

- ADR 0007 is annotated: Rule 2 superseded for schema v2 by this ADR; all other
  rules stand.
- **Winding is part of the contract.** `startVertexId` names the *outgoing*
  edge in clockwise order, so persisted outlines must already be clockwise.
  Kernel operations always emit clockwise outlines (`validateOutline`
  normalizes); the zod layout schema currently *accepts* counter-clockwise
  input that `validateOutline` could normalize, without rewriting the stored
  vertices — a CCW outline persisted as-is would flip which edge every record
  names. Follow-up (slice 2, before any layout is persisted): `layoutV2Schema`
  must reject or transform non-clockwise outlines, not merely confirm they are
  normalizable.
- `splitPieceAtSeam` and future piece-level outline edits carry edge records
  per Rule 2; outline-only kernel functions (e.g. `addNotch`) operate below the
  piece level, and their callers own record inheritance.

---

## Alternatives Rejected

**Ordered pair `{ fromVertexId, toVertexId }` (ADR 0007 Rule 2 as written)** —
made sense when `polygonEdges` exposed free-standing from/to endpoints; in a
closed ring the second component is derivable, and persisting it adds an
adjacency invariant that inserts/merges/splits can silently break. Rejected for
v2.

**Separate `edgeId` namespace** — gives edges identity independent of vertices,
but adds a second id space to allocate, persist, and clean up, for no capability
the start vertex doesn't already provide. Rejected.
