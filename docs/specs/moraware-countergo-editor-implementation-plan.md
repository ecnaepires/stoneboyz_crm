# Moraware CounterGo Editor Implementation Plan

Date: 2026-05-17

Source notes:

- `docs/moraware-live-gap-analysis-2026-05-16.md`
- `docs/moraware-countergo-audit.md`
- `docs/specs/moraware-parity-roadmap.md`

## Goal

Rebuild the quote drawing/editor workflow so existing CounterGo users can keep the same muscle memory in Stoneboyz CRM. The standard is interaction parity: same workflow order, same on-canvas entry points, same modal rhythm, same revision behavior, and the same visible feedback where practical.

This is not a broad UI refresh. It is a controlled parity build around the quote editor.

## Current Shape

The CRM already has useful foundations:

- Quote areas, counter pieces, edge segments, sink cutouts, drawing revisions, generated price lines, and pricing overrides.
- A six-step drawing shell in `DrawingCanvasInner.tsx`.
- Structured measurement and pricing cards.
- API routes for measurements, drawings, and pricing.

The main problem is workflow shape:

- Moraware is canvas-first and wizard-gated.
- The CRM is split across canvas placeholders, lower cards, and generic forms.
- Several CRM controls preserve data but not CounterGo muscle memory.

## Build Principles

- Keep structured measurement data as the source of truth.
- Treat the canvas as the primary authoring surface for drawing workflows.
- Keep lower forms as secondary support, not the default path.
- Implement parity in small visible slices that can be browser-tested.
- Do not start with a full drawing-engine rewrite. First replace the highest-friction interactions users touch every day.

## Phase 0 - Editor Shell Foundation

Purpose: make the CRM editor feel like one CounterGo-style workspace before deeper geometry work.

Primary files:

- `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx`
- `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCard.tsx`
- `apps/web/src/app/customers/[id]/quotes/_actions.ts`
- `apps/api/src/quotes/quote-drawing.controller.ts`
- `apps/api/src/quotes/quote-drawing.service.ts`

Build:

- Replace `Save Layout` with top-toolbar `Save` behavior.
- Add revision-note save modal with `Save & Continue` and `Save`.
- Add `Revisions` modal with revision number, created date, created by, notes, and revert action.
- Add editor-level `Exit` with dirty-state guard and `Discard Changes & Continue`.
- Add top toolbar actions: Help, Undo, Redo, Revisions, Save, Exit.
- Add step-aware right rail with visible mnemonic letters and collapsible state.
- Preserve current data save path while upgrading the UX around it.

Acceptance:

- Saving creates a drawing revision with optional notes.
- User can browse and revert revisions in the editor.
- Dirty editor exit shows an unsaved-changes modal.
- Tool rail changes by step and shows CounterGo-style command labels.

## Phase 1 - Step 1 Counter Dimensions

Purpose: replace rectangle-only/form-style editing with CounterGo's direct dimension workflow.

Primary files:

- `DrawingCanvasInner.tsx`
- `packages/domain/src/quotes/quote-drawing.types.ts`
- `packages/domain/src/quotes/quote-measurements.types.ts`
- `packages/domain/src/quotes/quote-measurements.ts`
- `tests/integration/quote-drawing.test.ts`

Build:

- Introduce a polyline/polygon piece model that can represent rectangles, L shapes, and Z shapes as one counter piece.
- Add chained drawing with locked segment turns.
- Show live segment measurements while dragging.
- Show turn-angle feedback such as `90 deg`.
- Add clickable edge labels.
- Add `Edge Length` modal with one `Length` field, inch units, preview, `Save & Next Edge`, and `Save`.
- Implement edge-walk order around the piece.
- Add on-piece context menu: Rotate Counter Left, Rotate Counter Right, Duplicate Counter, Delete Counter.

Acceptance:

- User can draw a rectangle, L shape, and Z shape as continuous shapes.
- Clicking a measurement opens the `Edge Length` modal.
- Repeated `Save & Next Edge` walks the selected piece edge by edge.
- Context menu actions happen on the piece, not in a lower form.

## Phase 2 - Step 2 Curves And Bumpouts

Purpose: make corner treatments local, visible, and modal-driven.

Primary files:

- `DrawingCanvasInner.tsx`
- `quote-drawing.types.ts`
- `quote-measurements.types.ts`
- `quote-measurements.ts`

Build:

- Render `-Std-` markers at each editable corner or transition.
- Add marker hit targets.
- Add floating corner menu: `Radius...`, `Clip...`, `Bump Out...`, `Notch...`, `None`.
- Add focused modals for Radius, Clip, Bump Out, and Notch.
- Each modal should use one-purpose fields and a miniature preview that highlights the active corner.
- Preserve dimension labels and angle context while editing treatments.

Acceptance:

- Each corner can be edited directly from its marker.
- Radius modal (title `Edit Corner - Radius`) defaults to `4` inches, previews active corner, single `Save` button (no Save & Next Corner).
- Saved treatments update the canvas marker and geometry state.

## Phase 3 - Step 3 Splash And Edge

Purpose: move edge/splash authoring from forms to the drawing surface.

Primary files:

- `DrawingCanvasInner.tsx`
- `MeasurementsCard.tsx`
- `quote-measurements.types.ts`
- `quote-pricing.ts`

Build:

- Render true segment-level edge markers, not one generic piece label.
- Add local edge menu containing (exact Moraware order confirmed live 2026-05-18):
  - `4" Splash`
  - `3" Splash`
  - `5" Splash`
  - `Other Splash...`
  - `Mitered Edge`
  - `Waterfall`
  - `Finished Edge ({profile name})` — e.g. `Finished Edge (Eased)`, checkmarked when active
  - `Appliance Edge`
  - `Unfinished Edge`
  - `Additional Finished Edge...`
- Add checkmark state for the active edge treatment.
- Add `Splash Height` modal with one `Height` field, default `4`, inch units, and preview.
- Support additional finished-edge groups such as `F1`, `F2`.
- Keep `MeasurementsCard` as a secondary editing/audit surface.

Acceptance:

- User can finish edge/splash setup from the canvas.
- Edge labels update immediately after treatment changes.
- Pricing quantities update from edge/splash changes.

## Phase 4 - Step 4 Sink And Cooktop

Purpose: make sinks and cooktops placement objects, not only form records.

Primary files:

- `DrawingCanvasInner.tsx`
- `MeasurementsCard.tsx`
- `quote-measurements.types.ts`
- `quote-measurements.ts`

Build:

- Add right-rail entry points for sink/cooktop placement once the exact Moraware labels are verified on a richer sample.
- Render sink/cooktop objects as selectable, draggable drawing objects.
- Add object actions for move, rotate, duplicate, and delete.
- Add cutout detail modal. Confirmed fields (live 2026-05-18): Sink Type, Shape, Cutout Dimensions (Length x Width), Faucet Hole Count, Show Centerline. No "Model" field exists in Moraware.
- Preserve existing sink form data model while making canvas placement primary.

Acceptance:

- User can add and position a sink/cooktop from Step 4.
- Sink/cooktop objects remain attached to a piece and survive drawing revision save/load.
- Form data and canvas position stay in sync.

## Phase 5 - Step 5 Color And Edge

Purpose: make area/product/color/edge and slab layout editor-native.

Primary files:

- `DrawingCanvasInner.tsx`
- `page.tsx`
- quote area actions and API routes
- price-list API/client code

Build:

- Replace placeholder Step 5 cards with area accordions.
- Add commands: Add color option, Re-order color options, Add area, Re-order areas.
- Add Product, Color, and Edge selectors inside the editor.
- Add Slabs & Layout section with slab rows and add-slab action.
- Keep area grouping visible across the editor.

Acceptance:

- User can manage area color/edge assignments without leaving the editor.
- Area order and color options are editable inside Step 5.
- Step 6 pricing uses the same area/color/edge selections.

## Phase 6 - Step 6 Price Details

Purpose: turn pricing into the final editor step, with clear diagnostics.

Primary files:

- `PricingCard.tsx`
- `DrawingCanvasInner.tsx`
- `quote-pricing.ts`
- `quote-pricing.service.ts`
- price-list domain/API modules

Build:

- Move generated pricing workflow into Step 6.
- Show price settings: price list revision, tax, discount, expiration.
- Group pricing by area.
- Show missing-price diagnostics inline with Moraware-level specificity.
- Add manual item flow and price override flow with reason/audit metadata.
- Add quote-level hard-failure banner for fatal pricing calculation errors.

Acceptance:

- User can finish quote pricing in Step 6.
- Missing prices and fatal pricing errors are differentiated.
- Every generated line remains explainable from drawing object and price rule.

## Phase 7 - Integrity, Print, And Communication

Purpose: close the loop around revisioned drawings and quote output.

Primary files:

- quote detail page
- quote PDF/email modules
- drawing/pricing services

Build:

- Add drawing validation and auto-correction feedback.
- Surface quote-detail warnings such as drawing auto-corrected state.
- Connect Print/Email actions to the latest saved quote revision.
- Add template/form selection parity after the editor is stable.

Acceptance:

- Invalid geometry is not silently accepted.
- Corrected drawings explain what happened and how to save the correction.
- Print/email output uses the intended drawing and pricing revision.

## First Coding Slice

Start with Phase 0 plus the smallest Phase 1 behavior:

1. Extract editor shell controls from `DrawingCanvasInner.tsx`.
2. Add top toolbar with `Revisions`, `Save`, and `Exit`.
3. Add revision-note save modal backed by existing drawing revision endpoint.
4. Add visible revision number/notes support if the API needs it.
5. Add dirty-state tracking and unsaved-exit guard.
6. Add on-piece context menu with `Delete Counter` first, then rotate/duplicate.

This slice is useful because it upgrades the workflow frame without forcing the polygon geometry model first.

## Phase 0 Technical Plan

This section is the handoff plan for coding Phase 0 on a cheaper model such as `5.4`.

### API And Data Changes

Current drawing API:

- `GET /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/drawing` returns the latest revision only.
- `POST /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/drawing` saves a new revision with layout only.
- `drawing_revisions` stores id, quote area, revision number, layout, created by, and created at.

Required for CounterGo parity:

- Add nullable `notes` to `drawing_revisions`.
- Add `notes?: string | null` to `DrawingRevision`.
- Add `notes?: string | null` to `SaveDrawingRevisionInput`.
- Add `notes` to `saveDrawingRevisionSchema`.
- Add `GET /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/drawing/revisions` to list revisions newest-first or revision-number descending.
- Add `POST /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/drawing/revisions/{revisionId}/revert` to create a new latest revision copied from the selected revision. This preserves append-only history while matching Moraware's `Revert to Revision` action.

Files:

- `db/migrations/025_add_notes_to_drawing_revisions.sql`
- `packages/domain/src/quotes/quote-drawing.types.ts`
- `packages/domain/src/quotes/quote-drawing.schemas.ts`
- `apps/api/src/quotes/quote-drawing.repository.ts`
- `apps/api/src/quotes/quote-drawing.service.ts`
- `apps/api/src/quotes/quote-drawing.controller.ts`
- `docs/specs/api/openapi.yaml`
- `packages/api-client/src/schema.ts`

Implementation details:

- Repository should add `notes` to `DrawingRevisionRow` and `mapRow`.
- `save(areaId, input)` should insert `notes`.
- Add `findAllByAreaId(areaId)`.
- Add `findById(areaId, revisionId)` or `findByAreaAndRevisionId`.
- Revert should validate quote/area status exactly like save, then insert a new revision with the old layout and a generated note if no user note is supplied, for example `Reverted to revision 1`.
- Keep current `GET /drawing` behavior unchanged so existing UI does not break.

### Web Server Actions

Current action:

- `saveDrawingAction(customerId, quoteId, areaId, layout)` posts only `{ layout }`.

Add:

- `saveDrawingAction(customerId, quoteId, areaId, layout, notes?)`
- `listDrawingRevisionsAction` is not ideal as a server action because the modal needs initial data. Prefer loading revision history in `DrawingCard` and passing it down, or add a small client-side fetch only if this route already has a client API pattern.
- `revertDrawingRevisionAction(customerId, quoteId, areaId, revisionId)` posts to the new revert endpoint and revalidates the quote detail path.

Files:

- `apps/web/src/app/customers/[id]/quotes/_actions.ts`
- `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCard.tsx`
- `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx`

### Web Component Shape

Keep this in `DrawingCanvasInner.tsx` for the first pass unless the file becomes too difficult to work with. Extraction can happen after behavior is working.

Add state:

- `const [isDirty, setIsDirty] = useState(false)`
- `const [saveModalOpen, setSaveModalOpen] = useState(false)`
- `const [revisionNotes, setRevisionNotes] = useState('')`
- `const [revisionsOpen, setRevisionsOpen] = useState(false)`
- `const [exitConfirmOpen, setExitConfirmOpen] = useState(false)`
- `const [contextMenu, setContextMenu] = useState<{ pieceId: string; x: number; y: number } | null>(null)`

Dirty-state rules:

- Set dirty on layout mutations: drag, resize, page break, text add, pan-free layout changes that should save, piece dimension override, piece create/delete/duplicate/rotate once added.
- Clear dirty after successful save.
- Keep zoom and pan out of dirty state unless the layout persists them later.

Top toolbar:

- Render above the six-step strip.
- Buttons: Help, Undo, Redo, Revisions, Save, Exit.
- Use icon+label layout matching Moraware's compact top bar.
- Disable Undo/Redo initially if no history stack exists, but keep the buttons visible.

Save modal:

- Title: `Save Quote`.
- Field label: `Notes about this revision:`.
- Buttons: `Save & Continue`, `Save`.
- `Save & Continue`: saves revision, clears dirty, closes modal, stays in editor.
- `Save`: saves revision, clears dirty, then follows the same route/behavior as Exit. If we keep the editor embedded on quote detail, close the modal and leave the user on the quote page for now.

Revisions modal:

- Title: `Revert to Quote Revision`.
- Table columns: action, Revision, Created, Created By, Notes.
- Action label: `Revert to Revision`.
- Revert should open a small confirmation or directly call the revert action only if we match Moraware's one-click behavior carefully. For first pass, use a confirmation if needed for safety, but keep wording close.

Exit modal:

- Title: `Unsaved Changes`.
- Message: `You have unsaved changes that will be lost if you continue.`
- Primary action: `Discard Changes & Continue`.
- Secondary close/back action.

On-piece context menu foundation:

- Clicking a piece should open a compact local menu instead of the lower `Edit Counter Piece` panel.
- First pass menu items: `Delete Counter`, plus disabled/visible `Rotate Counter Left`, `Rotate Counter Right`, `Duplicate Counter` if those are not implemented yet.
- Best first implementation: wire `Delete Counter` and close the menu; implement rotate/duplicate immediately after the toolbar/save work if time allows.
- Keep the old panel temporarily behind a feature flag or remove it only after parity menu actions cover the same functionality.

### Tests

API integration:

- Saving a drawing revision with notes persists and returns notes.
- Listing revisions returns all revisions in expected order with notes.
- Reverting revision 1 after revision 2 creates revision 3 with revision 1 layout.
- Revert rejects non-draft quotes with `INVALID_QUOTE_STATUS`.
- Revert returns 404 for missing revision in the area.

Domain/schema:

- `saveDrawingRevisionSchema` accepts missing notes, null notes, and string notes.
- It rejects non-string notes.

Web/browser:

- Toolbar renders Help, Undo, Redo, Revisions, Save, Exit.
- Save opens `Save Quote` modal.
- Save & Continue sends notes and clears dirty state.
- Revisions opens revision table.
- Exit with dirty state opens unsaved-changes modal.
- Delete Counter appears on piece click and deletes selected piece.

### Suggested Coding Order For 5.4

1. Add DB migration and domain schema/type support for revision notes.
2. Add repository/service/controller revision list and revert methods.
3. Update OpenAPI and regenerate API client.
4. Extend integration tests for notes, list, and revert.
5. Update web action `saveDrawingAction` to accept notes.
6. Pass latest revision and revision history from `DrawingCard` into `DrawingCanvasInner`.
7. Add top toolbar and save/revisions/exit modals.
8. Add dirty-state tracking.
9. Add on-piece context menu with `Delete Counter`.
10. Run targeted tests and verify in browser.

### Keep For Later

- Real undo/redo stack.
- Rotate and duplicate if Phase 0 grows too large.
- Full-screen editor route.
- Polygon/L/Z data model.
- Edge Length modal and Save & Next Edge.

## Verification Gates

- Domain tests for geometry utilities and edge-walk order.
- Integration tests for drawing revision notes, latest revision, and revert behavior.
- Browser checks for:
  - Save modal
  - Revision modal
  - Exit dirty guard
  - On-piece context menu
  - Edge Length modal
  - Step 3 edge menu
- Screenshot checks for desktop and tablet-size viewport.

## Open Questions

- Need a Moraware sample with live sink/cooktop objects for final Step 4 micro-interaction parity.
- Decide whether the shape model should store canonical vertices directly or derive vertices from piece plus segment/treatment records.
- Decide how much of the current `MeasurementsCard` remains visible once the editor becomes primary.
- Decide whether quote detail should embed the editor or link into a dedicated full-screen editor route.
