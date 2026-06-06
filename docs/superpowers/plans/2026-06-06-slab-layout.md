# Slab Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 2 slice 1 — manual Slab Layout. A cutter opens a Job's reserved material of one Material Color, drags the Job's pieces onto slab/remnant boards, marks Damage Zones, and sees fit flags. Design: `docs/superpowers/specs/2026-06-06-slab-layout-design.md`. Decision: `docs/adr/0005-physical-damage-zone-vs-photo-damage-mark.md`.

**Base branch:** Branch from `feat/slab-inventory-implementation` (Phase 1, unmerged), NOT `feat/dashboard-redesign`. Layout depends on the Phase 1 Slab model (`kind`/`availability`/`ownership`/`materialColorId`).

**Architecture:** Pure fit/overlap math in `@stoneboyz/domain`; layout persistence as a new API resource scoped to (job, material color); a react-konva board UI reachable from the Job page Slabs panel. Pieces are read from the Job's active quote `CanvasLayout`, filtered by Sheet material color.

**Tech Stack:** React, Next.js, react-konva, NestJS, PostgreSQL, Vitest, TypeScript, `@stoneboyz/domain`.

---

### Task 1: Domain — Layout Geometry And Fit

**Files:**
- Add: `packages/domain/src/inventory/slab-layout.types.ts`
- Add: `packages/domain/src/inventory/slab-layout.constants.ts`
- Add: `packages/domain/src/inventory/slab-layout.ts`
- Add: `packages/domain/src/inventory/slab-layout.test.ts`
- Modify: `packages/domain/src/index.ts`

- [x] Define types: `PiecePlacement` (pieceId, slabId, x, y, rotation 0|90), `DamageZone` (id, slabId, rect in inches), `SlabLayout` (jobId, materialColorId, placements, damageZones), and a `PlacementFlag` union (`out_of_bounds | piece_overlap | damage_overlap`).
- [x] Add `SLAB_LAYOUT_KERF_IN` (default 0.125) and `SLAB_LAYOUT_EDGE_MARGIN_IN` (default 0.5) named constants.
- [x] Implement `pieceFootprintInches(piece, placement)` → axis-aligned rects at 0/90 rotation. **Slice 1 = bounding rectangle only** (L/Z/chain decomposition deferred; shape segments on this branch are canvas units, not inches — see design "Pieces").
- [x] Implement `evaluatePlacements({ slabs, pieces, placements, damageZones })` → per-placement flags: out-of-bounds vs slab usable area (rect inset by edge margin), kerf-inflated overlap with other placements on the same slab, and Damage Zone overlap.
- [x] Implement `unplacedPieces(...)` and an `oversizedPieces(...)` helper (no slab can contain the footprint in either 0/90 orientation).
- [x] Tests first (red → green): bounds with margin, kerf overlap boundary, damage overlap, 90° rotation swap, unplaced + oversized detection. **11 tests green.**
- [x] Run `pnpm -C packages/domain typecheck` and `pnpm -C packages/domain build` — both clean.

### Task 2: DB — Layout Persistence

**Files:**
- Add: next migration in `db/migrations/` (append-only, one file).

- [x] Migration `060_create_slab_layouts.sql`: `slab_layouts` (id, project_id, material_color_id, created_by, created/updated, unique on (project, material_color)); `slab_layout_placements` (layout_id, **counter_piece_id** + **piece_instance**, slab_id, x_in, y_in, rotation 0|90, unique on (layout, piece, instance)); `slab_layout_damage_zones` (layout_id, slab_id, x_in, y_in, w_in, h_in).
- [x] **Decision:** placements FK `counter_pieces` (structured table with real dims/ids), not drawing-JSON piece ids. `quantity > 1` ⇒ multiple instances via `piece_instance`.
- [x] Applied + verified on dev DB; `resetDatabase` full-schema reset (DROP SCHEMA public) re-runs all migrations so the new tables are covered.

### Task 3: API — Layout Resource

**Files:**
- Add: layout mapper / repository / service / controller under `apps/api/src/inventory/` (match Phase 1 inventory structure).
- Add: integration test `tests/integration/slab-layout.test.ts`.

- [x] `GET .../customers/:customerId/projects/:projectId/slab-layouts/:materialColorId`: returns saved placements + damage zones, the reserved slabs/remnants of that material, the active-quote `counter_pieces` (expanded to one entry per quantity instance), and `unmatchedAreaMaterials`.
- [x] `PUT` (upsert) layout: replace placements + damage zones; one current layout per (project, material) via `ON CONFLICT` upsert + delete/reinsert children in a transaction.
- [x] Resolve pieces from the project's accepted quote (else latest) `counter_pieces`, alias-matched (`material_colors` name + `material_color_aliases`) against free-text `quote_areas.material`. Unmatched Sheet materials are **surfaced** in `unmatchedAreaMaterials`, not silently dropped.
- [x] Roles: edit (`PUT`) = `cutter` / `inventory_manager` / `admin`; view (`GET`) open to all authed incl `salesperson`.
- [x] Save never changes slab `availability` and creates no cut/remnant rows (asserted by test).
- [x] Integration tests (`tests/integration/slab-layout.test.ts`, 7): scope GET, save/reload round-trip, re-save overwrite, alias resolution, unmatched surfacing, salesperson read-but-not-write (403), availability/remnant untouched. Full suite **261 green**; api typecheck + spec:check clean.

### Task 4: Web — Layout Board

**Files:**
- Add: layout route + konva board components under `apps/web/src/app/` (mirror drawing workspace structure).
- Modify: Job page Slabs panel to add an "Open Layout" entry per material color.

- [ ] Render reserved slab/remnant boards to scale + a tray of unplaced pieces.
- [ ] Drag piece → board; 0/90 rotate control; draw Damage Zone tool.
- [ ] Surface per-piece flags (out-of-bounds / overlap / damage) visually; show unplaced + oversized count ("needs more material").
- [ ] Wire save/load to the API; restore placements, rotations, damage zones on reopen.
- [ ] Gate edit controls by role.

### Task 5: Verification

- [ ] `pnpm -C packages/domain test && pnpm -C packages/domain build`.
- [ ] `pnpm test:integration` (full suite green).
- [ ] `pnpm typecheck`.
- [ ] Browser workflow: open layout from a job, drag a piece, rotate, draw a Damage Zone, see flags, save, reopen, confirm restored.
- [ ] `git diff --check`.
