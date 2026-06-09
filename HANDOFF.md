## Agent Handoff

### Goal
Two changes this session:
1. Fix a bug where drawing on the quote canvas showed square footage in the Drawing
   Workspace header but `0` on the quote Measurements page.
2. Replace the multi-step "Generate Pricing" flow (Save Setup + per-area Generate +
   Generate Final Price) with a beginner-friendly **area accordion**: open one area,
   pick everything, press **Save area** to save selections and generate that area's
   frozen price lines in one click. As part of this, Sink and Faucet Hole pricing
   moved from quote-level to **per-area**.

### What changed

**Bug fix — canvas sqft vs quote page 0:**
- The canvas computed live measurements by synthesizing a piece `shape` from an
  in-memory `pieces` dimension array, but `saveDrawingAction` persisted only the raw
  `layout` (shape-less). The server recomputes from the saved layout and got `0`.
- Fixed by making `withPieceKinds` (the single transform every save goes through) also
  bake the measurement `shape` via `drawingLayoutWithRectangleMeasurementShapes`. The
  live display now uses the same `withPieceKinds(layout)`, so what you see is what is
  saved. No money math changed.

**Pricing — area accordion + per-area sink/faucet:**
- DB migration `059` adds `sink_item_id` + `faucet_hole_item_id` to
  `quote_area_pricing_selections`. Legacy quote-level columns left in place, now unused.
- Domain types/schemas: per-area selection gains `sinkItemId` / `faucetHoleItemId`.
- API: selections repository reads/writes the two new per-area columns; generation reads
  sink/faucet from the **area** selection instead of the quote-level selection.
- OpenAPI updated; `@stoneboyz/api-client` regenerated + built.
- New `saveAreaPricingAction` (PATCH this area's selection, then POST generate for it).
- New `PricingAccordion` client component; `PricingCard` rewritten to load data and feed
  it. Removed the duplicate "Generate Final Price" button from `MeasurementsCard`.

### Files touched
- `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx` - `withPieceKinds` bakes shape; live memo uses it.
- `db/migrations/059_add_area_sink_faucet_pricing_selections.sql` - per-area sink/faucet columns.
- `packages/domain/src/quotes/quote-pricing.types.ts` + `quote-pricing.schemas.ts` - per-area sink/faucet fields.
- `apps/api/src/quotes/quote-pricing-selections.repository.ts` - read/write new columns (merge-preserving upsert).
- `apps/api/src/quotes/quote-pricing.service.ts` - generation reads sink/faucet from area selection.
- `docs/specs/api/openapi.yaml` - `QuoteAreaPricingSelection` + upsert request gain sink/faucet.
- `packages/api-client/src/schema.ts` - regenerated.
- `apps/web/src/app/customers/[id]/quotes/_actions.ts` - `saveAreaPricingAction`.
- `apps/web/src/app/customers/[id]/quotes/[quoteId]/PricingAccordion.tsx` - new accordion UI.
- `apps/web/src/app/customers/[id]/quotes/[quoteId]/PricingCard.tsx` - rewritten to render the accordion.
- `apps/web/src/app/customers/[id]/quotes/[quoteId]/MeasurementsCard.tsx` + quote `page.tsx` - removed Generate Final Price + `isDraft` prop.
- `docs/superpowers/specs/2026-06-08-area-accordion-pricing-design.md` - design doc.
- `tests/integration/quote-pricing.test.ts` - per-area sink/faucet generation regression.

### Business logic affected
- Quotes/pricing: Sink and Faucet Hole selection is now per-area. Generated price lines
  per area = `selected item rate x area drawing-derived quantity`. Lines stay frozen
  until the area is saved again. Money still stored as integer cents.
- Measurements: drawing-derived per-area measurements now persist correctly (shape is
  saved into the layout), so the quote Measurements page matches the canvas.
- Job lifecycle / accounting: unchanged.

### Assumptions
- Per-area sink/faucet replaces quote-level for new pricing; legacy quote-level columns
  remain but are not read during generation.
- Per-line price Override UI is intentionally not surfaced in the accordion this pass
  (backend override endpoint/action still exist). Re-add later if needed.
- `generateAllPricingAction` in `_actions.ts` is now dead but left in place (not deleted).

### Validation
- `pnpm typecheck` (domain), `pnpm -C apps/api typecheck`, `pnpm -C apps/web typecheck`,
  `pnpm -C packages/api-client typecheck` - all clean.
- `pnpm db:migrate` - migration 059 applied.
- `pnpm test` - 514 passed / 48 files. Includes the new per-area sink/faucet regression.
- Not yet done: manual browser walkthrough of the real accordion; final git commit.

### Risks
- The live estimate in `PricingAccordion` duplicates the server's
  `quantityForMeasurementBasis`. It is preview-only (truth comes from the server on
  save), but the two could drift if the server math changes — keep them in sync.
- Dropping the legacy quote-level sink/faucet columns is deferred to a future migration.

### Next step
- Manual browser verification: draw a rectangle, save; open the quote; open an area in
  the accordion, pick sink/faucet, Save area, confirm frozen lines + Grand Total.
- Then commit. Optionally re-introduce per-line override UI and drop legacy quote-level
  sink/faucet columns in a later PR.
