# Fillet Mode Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Fillet workflow: choose Radius, Chamfer, or Sharp, then click two same-piece edges and update the corner.

**Architecture:** Reuse the existing `tool === "connect"` and `chainEdgeAction` edge-selection flow. Add a small workspace contract for Fillet modes, store the selected mode/value in `DrawingCanvasInner`, and extend the domain reference-line visual builder with chamfer connector output.

**Tech Stack:** React, Next.js, react-konva, Vitest, TypeScript, `@stoneboyz/domain`.

---

### Task 1: Workspace Fillet Contract

**Files:**
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.ts`
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts`

- [x] Add `DRAWING_FILLET_MODE_LABELS`, `DRAWING_FILLET_SIZE_PRESETS`, `DrawingFilletModeLabel`, `drawingCornerTreatmentForFilletMode`, and `drawingFilletModeRequiresValue`.
- [x] Add tests proving labels, treatment mapping, and value requirements.
- [x] Run `pnpm vitest run 'apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-workspace.test.ts' --exclude '**/.worktrees/**'` and confirm the new tests fail before implementation, then pass after implementation.

### Task 2: Chamfer Reference-Line Visual

**Files:**
- Modify: `packages/domain/src/drawing/types.ts`
- Modify: `packages/domain/src/drawing/geometry.ts`
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawingGeometry.test.ts`

- [x] Add a `DrawingReferenceLineVisualConnector` type for straight chamfer connectors.
- [x] Update `buildReferenceLineCornerVisuals` to return `{ segments, arcs, connectors }`.
- [x] Keep radius behavior unchanged.
- [x] For `clip` corners, trim the horizontal and vertical wall offset lines by the entered value and return a diagonal connector between the trimmed endpoints.
- [x] Add tests for chamfer connector rendering and existing radius compatibility.

### Task 3: Canvas Fillet UI And Apply Flow

**Files:**
- Modify: `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx`

- [x] Add state for selected Fillet mode and Fillet value.
- [x] Change the toolbar `Fillet` button to open a small mode/value popup and activate `tool === "connect"`.
- [x] Update `connectChainEdges` so `Sharp` uses the existing square-join behavior, while `Radius` and `Chamfer` save the selected corner treatment instead of square-joining the lines.
- [x] Render chamfer connectors from `referenceLineVisuals.connectors`.
- [x] Keep same-piece edge selection and existing Offset/Centerline behavior unchanged.

### Task 4: Verification

**Files:**
- Verify all changed files.

- [x] Run focused workspace and geometry tests.
- [x] Run `pnpm -C apps/web typecheck`.
- [x] Run `pnpm -C packages/domain build`.
- [x] Run `git diff --check`.
- [x] Confirm the dev server recompiles without errors.
