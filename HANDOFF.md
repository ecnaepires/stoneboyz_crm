# Session Handoff - 2026-05-26

## Current Direction
- Drawing V2 is abandoned.
- Continue all drawing and color-system work in V1: `apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx`.
- The `?v2=1` route switch has been removed from the quote edit page.
- The `apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-v2/` folder has been deleted.
- The old V2 drawing specs under `docs/specs/drawing/` have been deleted.

## Important Notes
- Keep `konva` and `react-konva` dependencies. V1 still imports and uses them directly.
- Keep `packages/domain/src/drawing/*`. V1 imports shared drawing helpers from `@stoneboyz/domain`.
- Do not rebuild the color system in V2.

## Next Step
Start the color system in V1 by extracting the hardcoded `PAINT_PALETTE` from `DrawingCanvasInner.tsx` into a small shared V1 drawing color config, then update the Paint toolbar and legend to use that config.
