# Slab Layout Design

## Context

Phase 1 (`feat/slab-inventory-implementation`, PR #3) built the slab/remnant inventory foundation: `kind`/`availability`/`ownership`, tag codes, material colors, storage locations, receipts, photos, Damage Marks, reservation/cut/remnant rules, and the remnant finder. Phase 2 begins with **Slab Layout** — the keystone that ties the inventory to the drawing: place a Job's pieces onto its reserved slabs and remnants to judge whether the material can be cut for the work.

This is the first Phase 2 slice. It is built **on the Phase 1 branch**, not on `feat/dashboard-redesign`, because it depends on the Phase 1 Slab model.

## Goal

A cutter (or inventory manager) opens a Job's reserved material of one Material Color, sees those slabs and remnants as boards plus a tray of the Job's unplaced pieces in that material, and drags each piece by hand onto a board. The layout reports out-of-bounds pieces, overlapping pieces, and pieces over a Damage Zone, and shows which pieces remain unplaced so the user knows whether more material is needed.

## Non-Goals

- Automatic nesting / auto-placement (later slice — a "Suggest layout" button over the same persistence + validation).
- Automatic damage avoidance during placement.
- Grain / vein direction matching.
- Driving the Phase 1 cut/remnant transaction from a saved layout (layout is a guide, not an executor).
- Layout revisions / history.
- Reusing or calibrating photo Damage Marks into physical space (see ADR 0005).
- True concave (L/Z/chain) piece footprints — slice 1 uses bounding rectangles (see Pieces).

## Domain Language

See CONTEXT.md. New/relevant terms:

- **Slab Layout** — a planning view that places a Job's pieces onto its reserved Slabs and Remnants of one Material Color, by hand, and flags out-of-bounds / overlapping / damage-overlapping pieces.
- **Damage Zone** — a region of unusable Slab surface in physical slab inches, authored on the layout board, that Slab Layout warns against. Distinct from a photo **Damage Mark** (ADR 0005).

## Placement Model

Manual. The user drags each piece onto a slab board and positions it. There is no automatic packing in this slice.

## Pieces

- Source: the Job's **accepted** quote; if none accepted, the **latest** quote. Not all quotes on the project.
- Filter: only pieces whose Sheet Material Color matches the board's material color. (A Sheet carries one material/color, so the filter is by Sheet material.)
- Included: countertop pieces **and** backsplash pieces (both consume the material).
- Dimensions come from the saved `CanvasLayout` (`lengthIn`/`widthIn`).
- **Footprint in slice 1 is the bounding rectangle** of each piece, not its true L/Z/chain outline. Reason: on the Phase 1 base branch the saved `PieceLayout.shape` segments are in drawing **canvas units** (scale 3 px/inch), not inches, so coupling the fit math to them is brittle. A bounding rectangle is conservative — it never reports "fits" when the piece won't — which is the safe error direction for a fit tool. True concave footprints (placing a piece into another's notch) are a later refinement once shapes are available in inch space.
- Sink and faucet cutouts are ignored for fit; a piece occupies its full footprint.
- A piece larger than every available board is shown in the tray flagged as unplaceable.

## Layout Unit

One Slab Layout is scoped to a **(Job, Material Color)** pair. It shows:

- every reserved Slab and Remnant of that material color as a board (drawn to scale from confirmed `lengthIn`/`widthIn`), and
- a tray of that material's unplaced pieces.

A Job needing multiple material colors has one layout per color. No board mixes material colors.

## Rotation

Pieces rotate in 0°/90° snaps (free-angle is out of scope). No grain/vein constraint — veining is a visual call the cutter makes off the photo, and no grain-direction field exists.

## Fit Validation

A piece placement is flagged (non-blocking — the user can still leave it) when:

1. **Out of bounds** — any part falls outside the slab's usable area. The usable area is the slab rectangle inset by a global **edge margin** constant (default ~0.5″).
2. **Piece overlap** — its footprint, inflated by a global **kerf** constant (default 1/8″), overlaps another placed piece.
3. **Damage overlap** — its footprint overlaps a Damage Zone.

Kerf and edge margin are single named constants (same pattern as backsplash offset/height defaults), not per-slab editable in this slice.

Lengths are inches, displayed rounded to 1/16″ (measurement default).

## Damage Zones

Authored directly on a slab board, in physical slab inches. Each Damage Zone is a rectangle (or rectilinear region) the user draws on the board. Non-blocking: placing a piece over a zone warns but does not prevent. Photo Damage Marks are untouched and are not converted (ADR 0005).

## Persistence

- One current layout saved per (Job, Material Color). Saving overwrites.
- A saved layout records, per piece: which slab/remnant it is assigned to, position, and rotation; plus the board's Damage Zones.
- Saving a layout does **not** reserve slabs and does **not** create cut/remnant records. Reservation stays the Phase 1 link action; the cut/remnant flow stays the Phase 1 cut action. Layout is a guide the cutter follows.
- No layout revisions in this slice.

## UI

- Entry: Job page **Slabs panel** → "Open Layout" per material color. Also linkable from a Slab's detail.
- Surface: a full-screen drag canvas built on react-konva (same stack as the drawing workspace).
- Tray of unplaced pieces; boards drawn to scale; drag piece → board; rotate control; Damage Zone draw tool; per-piece flags surfaced visually; an "unplaced / needs more material" indicator.

## Roles

- Create/edit layout and author Damage Zones: `cutter`, `inventory_manager`, `admin`.
- View: all inventory-viewing roles, including `salesperson` (to judge feasibility for quoting).

## Validation Scenarios

- A Job's pieces in one material can be placed onto its reserved slabs/remnants of that material.
- A piece dragged off the usable area is flagged out-of-bounds.
- Two pieces closer than the kerf gap are flagged overlapping.
- A piece over a Damage Zone is flagged, but can still be left placed.
- Pieces that don't fit remain in the tray, signalling more material is needed.
- A remnant board accepts pieces exactly like a full slab board.
- Reopening the Job's layout restores placements, rotations, and Damage Zones.
- Saving a layout changes no slab availability and creates no cut/remnant records.
- A second material color on the same Job opens a separate board with its own pieces.

## Testing

- Domain: pure fit functions — bounds test with edge margin, kerf-inflated overlap between rectilinear (0/90-rotated) footprints, Damage Zone overlap. Golden cases for L/Z/chain shapes.
- API: integration against real PostgreSQL — save/load layout per (job, material), role permissions on edit, layout never mutates availability or cut state.
- Web: browser workflow — open layout from job, drag a piece onto a slab, rotate, draw a Damage Zone, see flags, save, reopen.
