# ADR 0003 — Drawing Workspace: Field-First, Single Source of Truth

**Status:** Accepted  
**Date:** 2026-06-03  
**Deciders:** Owner

---

## Context

[ADR 0002](./0002-drawing-geometry-redesign.md) fixed the *geometry core* — one canonical chain model, inches are truth, all tools share one edge derivation. It did not touch two problems one layer up: how a drawing is **persisted**, and who the workspace is **for**.

Both are broken today.

### Two disconnected sources of truth (persistence)

| The user does this | Writes to | The summary reads | Result |
|---|---|---|---|
| Draws on the canvas | `drawing_revisions.layout` JSON | ❌ not this | drawing never moves the numbers |
| Types width/length in a form | `counter_pieces` rows | ✅ this | numbers change, drawing doesn't |

The per-Sheet measurement summary is computed in SQL straight from the normalized tables (`apps/api/src/quotes/quote-areas.repository.ts:180-188`), reading `counter_pieces`, `edge_segments`, `sink_cutouts`. The canvas draws into a *different* store, `drawing_revisions.layout`. They never reconcile. This is 0002's "measurements drift — dual source of truth" disease, at the persistence layer.

The summary math also exists **twice**: once correctly in the domain (`packages/domain/src/quotes/quote-measurements.ts`, `calculateMeasurementAreaTotals`, which already separates `countertopSqFt` / `backsplashSqFt` / `combinedSqFt` and honors the Splash-vs-Backsplash distinction) and again, re-implemented, in the repository SQL. The frontend then declares a third, narrower totals type that silently drops `backsplashSqFt` and `combinedSqFt` (`apps/web/src/app/customers/[id]/quotes/[quoteId]/MeasurementsCard.tsx:27`) — which is why drawn backsplashes feel "not added up."

### Wrong audience (workspace shape)

The drawing workspace is a linear 6-step wizard (`Counter Dimensions → Curves & Bumpouts → Splash & Edge → Sink & Cooktop → Color & Edge → Price Details`). The person who actually uses it is a **Templater** standing in a customer's kitchen with a tape measure and 20 minutes — he does not work in steps, and he does not price. Pricing (step 6) is back-office work done by a **Salesperson** against a price list. Forcing both into one linear field tool is most of the "confusing dashboard."

A separate Areas admin screen (`quote_areas`: name / sort / material / color form) duplicates what the Sheet tabs should own and adds clutter for no field value.

---

## Decision

### Rule 1 — The drawing is the only source of truth

Each Sheet's `layout` (one JSON document per Sheet, per [ADR 0002](./0002-drawing-geometry-redesign.md)'s inches-are-truth geometry) is the single store for all entities: counter pieces, backsplashes, sinks, faucet holes, and edges. The normalized `counter_pieces`, `edge_segments`, and `sink_cutouts` tables are dropped. The duplicated totals SQL (`quote-areas.repository.ts:180-188`) is deleted.

### Rule 2 — Totals are derived, never stored, computed in one place

The per-Sheet summary is produced exclusively by the domain function `calculateMeasurementAreaTotals` over the Sheet's `layout`. The frontend consumes that result directly — no re-declared, narrower totals type. There is exactly one measurement formula in the codebase.

### Rule 3 — A Sheet is a name + a drawing

A Sheet **is** a `quote_area`, but its only user-facing identity is its **name** and its **drawing**. Sheets are created, switched, and renamed from spreadsheet-style **tabs at the bottom of the workspace** (double-tap a tab to rename). The standalone Areas admin screen is removed. Material/color is set on the drawing, not in an admin form. Room names offered as **self-growing, company-wide quick-pick chips** (same mechanism as company-wide backsplash-height presets): typing a new room name once makes it a chip for the whole team next time — no curation UI.

### Rule 4 — Field and office are different surfaces

The drawing workspace belongs to the **Templater**: draw, measure, divide by room. It contains **no pricing**. Pricing belongs to the **Salesperson**, who receives the finished drawing and its derived measurements and applies a price list on a separate office surface. Step 6 (Price Details) leaves the workspace.

### Rule 5 — Tool palette, not a wizard

The 6-step wizard is retired. The workspace is one canvas with a **tool palette** (Counter, Backsplash, Sink, Faucet, Edge, Color) usable in any order, a **read-only summary** strip beneath the canvas (counters, backsplash, combined sf, finished-edge lf, splash sf, sinks, faucet holes), and the room tabs. Geometry is corrected **in place** on the canvas (tap a dimension, type the measured value) — the only typing, and it is a real tape measurement, not a form.

---

## Consequences

- DB migration drops `counter_pieces`, `edge_segments`, `sink_cutouts` and the area-totals query; existing rows migrate into the per-Sheet `layout`.
- `MeasurementsCard` hand-entry forms are deleted; the canvas is the sole input.
- The frontend's local `QuoteMeasurementAreaTotals` type is removed in favor of the domain/API contract, restoring `backsplashSqFt` and `combinedSqFt`.
- `counter_pieces.kind` stays `countertop | backsplash`. No `floor_tile`.
- The Areas admin UI on the customer/project page is removed.
- Pricing (price list, labor) is designed as a Salesperson surface, out of scope here and deferred.
- **Future extension (deferred, not built):** selling to a tile/flooring company is a Sheet whose pieces contribute square footage only — no edges, no sinks, no backsplash — i.e. a strictly simpler case on this same `layout`-per-Sheet foundation. One new kind + one summary line when it's actually needed. Not modeled now.

---

## De-risk Path

Honors [ADR 0002](./0002-drawing-geometry-redesign.md)'s rule: no big-bang.

1. **Regression catalog** — lock current correct totals as failing/golden tests over the domain function before touching persistence.
2. **Derive-from-layout PoC** — compute one Sheet's summary from `layout` via `calculateMeasurementAreaTotals`, prove it matches the old SQL totals on real data. Go/no-go gate.
3. **Cut the read path** — point the summary at the domain result; delete the duplicated SQL and the frontend's narrower type.
4. **Drop the tables** — migrate `counter_pieces` / `edge_segments` / `sink_cutouts` into `layout`, then drop them.
5. **Reshape the UI** — wizard → tool palette + summary + room tabs; remove the Areas admin screen and hand-entry forms; move pricing to the Salesperson surface.

---

## Alternatives Rejected

**Keep both stores, sync them** — a background reconcile between `layout` and the normalized tables. Re-creates the exact dual-source-of-truth disease 0002 named; sync drift is unfixable by construction.

**Add a summary on top of the existing wizard/forms** — leaves the double-entry and the linear flow the Templater doesn't use. Adds surface instead of removing it.

**Build the flooring/tile product now** — speculative; no current customer. The chosen model already accommodates it later at near-zero cost, so deferring loses nothing.
