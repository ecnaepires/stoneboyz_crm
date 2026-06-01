# Cleanup & Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close three concrete open items: (1) add Cut activity to Standard Job template seed, (2) add pure unit tests for drawing connect geometry, (3) remove stale code-gap warnings from CONTEXT.md.

**Architecture:** Single migration for the JobTemplate fix (UPDATE on job_templates via a new .sql file). Domain tests added directly to the existing `geometry.test.ts` file using Vitest. CONTEXT.md edited in-place to remove two stale warnings.

**Tech Stack:** PostgreSQL migration (raw SQL), Vitest (domain tests), Markdown

---

## Investigation summary (already done — do not re-investigate)

- Notes UI for Job/Quote/Activity: **fully implemented** (projects/[id]/page.tsx, quotes/[quoteId]/page.tsx, events/[eventId]/page.tsx)
- Portal pipeline display: **fully implemented** in both portal.service.ts and portal/quotes/[token]/page.tsx
- Drawing tools (Offset, Connect, Delete): **all implemented** in DrawingCanvasInner.tsx
- **Gap 1:** Standard Job template (migration 036) has sortOrders Template(1) Deposit(2) Material(3) Fabrication(4) Install(5) Invoice(6) Repair(7) — **Cut is missing** between Material and Fabrication. Migration 042 added the `cut` appointment type to the DB constraint but the seed was never updated.
- **Gap 2:** `connectEdgesToRectangle` in `packages/domain/src/drawing/geometry.ts:1425` has **zero tests**. The drawing-workflow-spec.md requires: "Two-edge rectangle connect" covered in pure tests.
- **Gap 3:** CONTEXT.md has two stale ⚠️ Code gap warnings: Note entity block says "Notes web UI pending for JobNote/QuoteNote/ActivityNote" and CustomerPortal block says "Portal pipeline display API done; web UI shows stubs."

---

## Task 1: Add Cut activity to Standard Job template

**Files:**
- Create: `stoneboyz_crm/db/migrations/053_update_standard_job_template_add_cut.sql`

### Context

Migration 036 seeded `standard-job` with 7 activities. Migration 042 added `cut` to the appointment_type enum constraint on `scheduled_events`. The `activity_specs` JSONB column on `job_templates` needs Cut inserted at sortOrder 4, with Fabrication bumped to 5, Install to 6, Invoice to 7, Repair to 8.

The `customer-pickup` template does NOT get Cut (pickup flow has no cut step).

- [ ] **Step 1: Write the migration**

Create `stoneboyz_crm/db/migrations/053_update_standard_job_template_add_cut.sql`:

```sql
UPDATE job_templates
SET
  activity_specs = '[
    {"sortOrder":1,"title":"Template","eventType":"appointment","appointmentType":"template","templateKind":"physical_template","durationMinutes":90,"notes":null},
    {"sortOrder":2,"title":"Deposit","eventType":"appointment","appointmentType":"deposit","templateKind":null,"durationMinutes":30,"notes":null},
    {"sortOrder":3,"title":"Material","eventType":"appointment","appointmentType":"material","templateKind":null,"durationMinutes":60,"notes":null},
    {"sortOrder":4,"title":"Cut","eventType":"appointment","appointmentType":"cut","templateKind":null,"durationMinutes":60,"notes":null},
    {"sortOrder":5,"title":"Fabrication","eventType":"appointment","appointmentType":"fabrication","templateKind":null,"durationMinutes":120,"notes":null},
    {"sortOrder":6,"title":"Install","eventType":"appointment","appointmentType":"install","templateKind":null,"durationMinutes":120,"notes":null},
    {"sortOrder":7,"title":"Invoice","eventType":"appointment","appointmentType":"invoice","templateKind":null,"durationMinutes":15,"notes":null},
    {"sortOrder":8,"title":"Repair","eventType":"appointment","appointmentType":"repair","templateKind":null,"durationMinutes":60,"notes":null}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'standard-job';
```

- [ ] **Step 2: Apply the migration to the test DB**

```powershell
cd stoneboyz_crm
pnpm db:test:reset
```

Expected: runs without error, all previous migrations apply cleanly, migration 053 runs.

- [ ] **Step 3: Verify the test suite still passes**

```powershell
pnpm test --run
```

Expected: all tests pass (previously 301/301 or similar green count).

- [ ] **Step 4: Commit**

```
git add stoneboyz_crm/db/migrations/053_update_standard_job_template_add_cut.sql
git commit -m "feat: add Cut activity to Standard Job template seed (migration 053)"
```

---

## Task 2: Add pure geometry tests for connectEdgesToRectangle

**Files:**
- Modify: `stoneboyz_crm/packages/domain/src/drawing/geometry.test.ts`

### Context

`connectEdgesToRectangle` lives in `packages/domain/src/drawing/geometry.ts:1425`. It takes two `DrawingShapeEdge` objects and returns a rect + chain segment connecting them, or `null` if degenerate. The spec (`docs/drawing-workflow-spec.md`) requires geometry tests before UI wiring.

`DrawingShapeEdge` type: `{ from: [number, number]; to: [number, number] }`.

SCALE = 3 (1 inch = 3px) — match the constant already used in geometry.test.ts.

The function is already exported from `geometry.ts`. Import it in the test file alongside the existing imports.

- [ ] **Step 1: Read the current test file imports**

Open `packages/domain/src/drawing/geometry.test.ts` and verify what's already imported. The import block at the top should look like:

```typescript
import {
  backsplashCornerCandidatesForEdges,
  buildChainFromClicks,
  buildChainFromDragPath,
  chainShapeGeometry,
  mergeDrawingBoundaryEdges,
  rectUnionBoundaryEdges,
  rectsToChainSegments,
  visibleBoundaryEdges,
} from "./geometry.js";
```

- [ ] **Step 2: Add `connectEdgesToRectangle` to the import and write failing tests**

Add `connectEdgesToRectangle` to the import block. Then append this `describe` block at the end of the test file:

```typescript
describe("connectEdgesToRectangle", () => {
  const SCALE = 3;

  it("returns null for the same edge (degenerate case)", () => {
    const edge: { from: [number, number]; to: [number, number] } = {
      from: [0, 0],
      to: [96 * SCALE, 0],
    };
    expect(connectEdgesToRectangle({ firstEdge: edge, secondEdge: edge, scale: SCALE })).toBeNull();
  });

  it("connects a horizontal and vertical edge into a rectangle", () => {
    // horizontal edge along y=0, from x=0 to x=96*SCALE
    const hEdge: { from: [number, number]; to: [number, number] } = {
      from: [0, 0],
      to: [96 * SCALE, 0],
    };
    // vertical edge along x=96*SCALE, from y=0 to y=25.5*SCALE
    const vEdge: { from: [number, number]; to: [number, number] } = {
      from: [96 * SCALE, 0],
      to: [96 * SCALE, 25.5 * SCALE],
    };
    const result = connectEdgesToRectangle({
      firstEdge: hEdge,
      secondEdge: vEdge,
      scale: SCALE,
    });
    expect(result).not.toBeNull();
    expect(result!.rect.w).toBeGreaterThan(0);
    expect(result!.rect.h).toBeGreaterThan(0);
    expect(result!.lengthIn).toBeGreaterThan(0);
    expect(result!.widthIn).toBeGreaterThan(0);
  });

  it("connects two parallel horizontal edges into a rectangle", () => {
    // two parallel horizontal edges — top and bottom of a rectangle
    const topEdge: { from: [number, number]; to: [number, number] } = {
      from: [0, 0],
      to: [60 * SCALE, 0],
    };
    const bottomEdge: { from: [number, number]; to: [number, number] } = {
      from: [0, 25.5 * SCALE],
      to: [60 * SCALE, 25.5 * SCALE],
    };
    const result = connectEdgesToRectangle({
      firstEdge: topEdge,
      secondEdge: bottomEdge,
      scale: SCALE,
    });
    expect(result).not.toBeNull();
    expect(result!.lengthIn).toBeCloseTo(60, 0);
    expect(result!.widthIn).toBeCloseTo(25.5, 0);
  });

  it("returns null when resulting rect is smaller than one scale unit", () => {
    // edges that are too close together
    const edge1: { from: [number, number]; to: [number, number] } = {
      from: [0, 0],
      to: [0, 0],
    };
    const edge2: { from: [number, number]; to: [number, number] } = {
      from: [0, 0],
      to: [0, 1], // 1px apart — less than SCALE=3
    };
    expect(
      connectEdgesToRectangle({ firstEdge: edge1, secondEdge: edge2, scale: SCALE })
    ).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify new tests pass**

```powershell
npx vitest run packages/domain/src/drawing/geometry.test.ts
```

Expected: all tests pass including the 4 new ones.

- [ ] **Step 4: Run full test suite to check no regressions**

```powershell
pnpm test --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```
git add packages/domain/src/drawing/geometry.test.ts
git commit -m "test: add pure geometry tests for connectEdgesToRectangle"
```

---

## Task 3: Remove stale code-gap warnings from CONTEXT.md

**Files:**
- Modify: `CONTEXT.md` (repo root — `stoneboyz_crm/CONTEXT.md`)

### Context

Two `⚠️ Code gap:` lines in CONTEXT.md are stale. Both features are fully implemented. Leaving stale warnings in the glossary creates confusion about what's actually missing.

**Note entry** currently reads:
> `- ⚠️ Code gap: Notes web UI pending for JobNote/QuoteNote/ActivityNote. DB+API are done.`

**CustomerPortal entry** currently reads:
> `- ⚠️ Code gap: Portal pipeline display API done; web UI shows stubs.`

Both need removal. Do not add replacement text — the implementations speak for themselves.

- [ ] **Step 1: Find and remove the two stale warnings**

In `CONTEXT.md`, remove the entire line:
```
- ⚠️ Code gap: Notes web UI pending for JobNote/QuoteNote/ActivityNote. DB+API are done.
```

Also remove the entire line:
```
- ⚠️ Code gap: Portal pipeline display API done; web UI shows stubs.
```

- [ ] **Step 2: Verify no other stale warnings need updating**

Grep for remaining `⚠️ Code gap` entries and confirm each still accurately describes an actual gap. Do not remove warnings that are genuinely still open (e.g., ChangeLog audit table).

```powershell
Select-String -Path "CONTEXT.md" -Pattern "Code gap"
```

Remaining valid gaps (do NOT remove):
- `ChangeLog` — "no audit table yet. Domain events emitted but not persisted"

- [ ] **Step 3: Commit**

```
git add CONTEXT.md
git commit -m "docs: remove stale code-gap warnings for Notes UI and Portal pipeline"
```

---

## Verification

After all three tasks:

- [ ] Run `pnpm test --run` — all tests green
- [ ] Run typecheck: `pnpm typecheck:api` and `pnpm typecheck:web` — both clean
- [ ] Confirm `CONTEXT.md` has no stale warnings

---

## Out of scope (need grilling sessions first)

The following from `docs/open-questions.md` are NOT in this plan because they need domain design decisions before implementation:

- Calendar view (day/week/month, per-role filter)
- Payment terms / deposit % per phase
- Salesperson commission tracking
- Reports (revenue, slab usage, lead conversion)
- Email/SMS templates
- Configurable forms / form-builder
- Slab reservation transfer at Quote→Order
- Quote revisions / versioning

Revisit these with `/grill-with-docs` before implementing.
