# Quotes Module

## Purpose

Quotes module owns price proposals for stone/marble fabrication work in Stoneboyz CRM.

A quote is a formal price proposal sent to a customer for a defined scope of stone/marble work. Quote records are the anchor for line items, status tracking, financial totals, and proposal history.

This module answers:
- What is being quoted, and for which customer or project?
- What materials, dimensions, and labor are included?
- What is the total price?
- What stage is the proposal in — draft, sent, accepted, or rejected?

## Entities (what data exists)

### Quote

Primary record for a price proposal.

Fields:
- `id`: UUID
- `customerId`: UUID, required FK → customers
- `projectId`: UUID, optional FK → projects
- `quoteNumber`: string, auto-generated on create, format `Q-{YYYY}-{NNN}` (e.g. `Q-2026-001`), unique
- `title`: string, required
- `status`: one of `draft`, `sent`, `accepted`, `rejected`
- `validUntil`: date, optional
- `subtotalCents`: integer, computed from line items — NOT stored in DB; returned in API response
- `discountCents`: integer, default 0, must be >= 0
- `taxRateBps`: integer in basis points (e.g. 1500 = 15%), default 0
- `totalCents`: integer, computed: `floor((subtotalCents - discountCents) * (1 + taxRateBps / 10000))` — NOT stored in DB; returned in API response
- `notes`: text, optional, internal only
- `termsAndConditions`: text, optional
- `sentAt`: timestamptz, nullable — set when status transitions to `sent`
- `acceptedAt`: timestamptz, nullable — set when status transitions to `accepted`
- `rejectedAt`: timestamptz, nullable — set when status transitions to `rejected`
- `archivedAt`: nullable ISO 8601 UTC timestamp exposed by API; stored as `deleted_at` in DB
- `archivedByUserId`: nullable UUID
- `createdAt`: ISO 8601 UTC timestamp
- `updatedAt`: ISO 8601 UTC timestamp

### QuoteLineItem

A single line in the quote for a specific stone/material item.

Fields:
- `id`: UUID
- `quoteId`: UUID, FK → quotes (cascade delete)
- `sortOrder`: integer, default 0, determines display order
- `stoneType`: string, required (e.g. `"Marble Calacatta"`, `"Granite Black Galaxy"`)
- `lengthIn`: number, nullable
- `widthIn`: number, nullable
- `thicknessCm`: number, nullable
- `edgeProfile`: string, nullable (e.g. `"eased"`, `"beveled"`, `"bullnose"`, `"ogee"`)
- `qty`: numeric, required, must be > 0
- `qtyUnit`: string, required (e.g. `"sqm"`, `"slab"`, `"lm"`, `"piece"`)
- `unitPriceCents`: integer, required, must be >= 0
- `laborPriceCents`: integer, default 0, must be >= 0
- `lineTotalCents`: integer, computed: `floor(qty * (unitPriceCents + laborPriceCents))` — NOT stored in DB; returned in API response
- `notes`: text, optional
- `createdAt`: ISO 8601 UTC timestamp
- `updatedAt`: ISO 8601 UTC timestamp

## Business Rules (what must always be true)

- Only `draft` quotes can have their header fields edited (`title`, `notes`, `validUntil`, `discountCents`, `taxRateBps`, `termsAndConditions`).
- Only `draft` quotes can have line items added, updated, or removed.
- Status transitions are linear — no back-transitions allowed:
  - `draft` → `sent`: POST `.../send`
  - `sent` → `accepted`: POST `.../accept`
  - `sent` → `rejected`: POST `.../reject`
  - `sent` cannot go back to `draft`. `accepted` and `rejected` are terminal.
- Each status transition requires `actorUserId` in the request body.
- `quoteNumber` is auto-generated on create. Format: `Q-{YYYY}-{NNN}` where `YYYY` is the calendar year and `NNN` is zero-padded sequential number per year (minimum 3 digits). Example: `Q-2026-001`.
- `subtotalCents` = sum of all `lineTotalCents` for the quote's line items.
- `totalCents` = `floor((subtotalCents - discountCents) * (1 + taxRateBps / 10000))`.
- A quote with no line items has `subtotalCents = 0` and `totalCents = 0`.
- Line items are hard-deleted when their quote is archived or deleted (cascade). No soft-delete on line items.
- Line items may only be deleted via API when the quote is in `draft` status.
- Counter pieces, edge segments, and sink cutouts are hard-deleted when their quote area is deleted (cascade).
- Counter pieces, edge segments, and sink cutouts may only be added, updated, or deleted when the quote is in `draft` status.
- Quote area responses include `measurementTotals`, computed from counter pieces, edge segments, and sink cutouts.
- When a customer is archived, their quotes are NOT automatically archived. Quote history is preserved.
- Archived customers cannot receive new quotes.
- `discountCents` must not exceed `subtotalCents` (application-level validation, not DB constraint).
- Events must be emitted after successful transaction commit only.
- `actorUserId` is required on all mutating requests.

## API Endpoints (what operations exist)

Base path: `/customers/{customerId}/quotes`

- `actorUserId` (string UUID) is required on all mutating requests.

### Quotes

- `GET /customers/{customerId}/quotes`: List quotes for a customer. Supports filtering by `status` and `projectId`. Cursor pagination.
- `POST /customers/{customerId}/quotes`: Create a new quote. Optionally accepts a `lineItems` array to create line items in the same request.
- `GET /customers/{customerId}/quotes/{quoteId}`: Get quote detail with line items embedded in response.
- `PATCH /customers/{customerId}/quotes/{quoteId}`: Update quote header fields. Draft only.
- `POST /customers/{customerId}/quotes/{quoteId}/send`: Transition quote from `draft` to `sent`.
- `POST /customers/{customerId}/quotes/{quoteId}/accept`: Transition quote from `sent` to `accepted`.
- `POST /customers/{customerId}/quotes/{quoteId}/reject`: Transition quote from `sent` to `rejected`.
- `POST /customers/{customerId}/quotes/{quoteId}/archive`: Soft-delete the quote.

### Line Items

- `GET /customers/{customerId}/quotes/{quoteId}/line-items`: List all line items for a quote.
- `POST /customers/{customerId}/quotes/{quoteId}/line-items`: Add a line item. Draft only.
- `PATCH /customers/{customerId}/quotes/{quoteId}/line-items/{lineItemId}`: Update a line item. Draft only.
- `DELETE /customers/{customerId}/quotes/{quoteId}/line-items/{lineItemId}`: Remove a line item. Draft only.

### Quote Areas

- `GET /customers/{customerId}/quotes/{quoteId}/areas`: List all areas for a quote. Each area includes `measurementTotals`.
- `POST /customers/{customerId}/quotes/{quoteId}/areas`: Create a quote area. Draft only.
- `PATCH /customers/{customerId}/quotes/{quoteId}/areas/{areaId}`: Update a quote area. Draft only.
- `DELETE /customers/{customerId}/quotes/{quoteId}/areas/{areaId}`: Remove a quote area. Draft only.

### Quote Measurements

- `GET /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pieces`: List counter pieces for an area.
- `POST /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pieces`: Add a counter piece. Draft only.
- `PATCH /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pieces/{id}`: Update a counter piece. Draft only.
- `DELETE /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pieces/{id}`: Remove a counter piece. Draft only.
- `GET /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/edges`: List edge segments for an area.
- `POST /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/edges`: Add an edge segment. Draft only.
- `PATCH /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/edges/{id}`: Update an edge segment. Draft only.
- `DELETE /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/edges/{id}`: Remove an edge segment. Draft only.
- `GET /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/sinks`: List sink cutouts for an area.
- `POST /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/sinks`: Add a sink cutout. Draft only.
- `PATCH /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/sinks/{id}`: Update a sink cutout. Draft only.
- `DELETE /customers/{customerId}/quotes/{quoteId}/areas/{areaId}/sinks/{id}`: Remove a sink cutout. Draft only.

List filters for quotes:
- `status`
- `projectId`

Default sort: `updatedAt` descending.

## Events (what this module emits)

Event names follow `entity.action` format from `docs/specs/events/catalog.v1.yaml`.

- `quote.created`: Quote record created. Payload: `quoteId`, `customerId`, `actorUserId`.
- `quote.updated`: Quote header fields changed. Payload: `quoteId`, `customerId`, `actorUserId`, `changedFields[]`.
- `quote.sent`: Quote transitioned to `sent`. Payload: `quoteId`, `customerId`, `actorUserId`.
- `quote.accepted`: Quote transitioned to `accepted`. Payload: `quoteId`, `customerId`, `actorUserId`.
- `quote.rejected`: Quote transitioned to `rejected`. Payload: `quoteId`, `customerId`, `actorUserId`.
- `quote.archived`: Quote archived. Payload: `quoteId`, `customerId`, `actorUserId`.
- `quote.line_item_added`: Line item added to quote. Payload: `quoteId`, `lineItemId`, `customerId`, `actorUserId`.
- `quote.line_item_updated`: Line item updated. Payload: `quoteId`, `lineItemId`, `customerId`, `actorUserId`, `changedFields[]`.
- `quote.line_item_removed`: Line item removed. Payload: `quoteId`, `lineItemId`, `customerId`, `actorUserId`.
- `quote.area_added`: Quote area added. Payload: `quoteId`, `areaId`, `customerId`, `actorUserId`.
- `quote.area_updated`: Quote area updated. Payload: `quoteId`, `areaId`, `customerId`, `actorUserId`, `changedFields[]`.
- `quote.area_removed`: Quote area removed. Payload: `quoteId`, `areaId`, `customerId`, `actorUserId`.
- `quote.counter_piece_added`: Counter piece added. Payload: `quoteId`, `areaId`, `measurementId`, `customerId`, `actorUserId`.
- `quote.counter_piece_updated`: Counter piece updated. Payload: `quoteId`, `areaId`, `measurementId`, `customerId`, `actorUserId`, `changedFields[]`.
- `quote.counter_piece_removed`: Counter piece removed. Payload: `quoteId`, `areaId`, `measurementId`, `customerId`, `actorUserId`.
- `quote.edge_segment_added`: Edge segment added. Payload: `quoteId`, `areaId`, `measurementId`, `customerId`, `actorUserId`.
- `quote.edge_segment_updated`: Edge segment updated. Payload: `quoteId`, `areaId`, `measurementId`, `customerId`, `actorUserId`, `changedFields[]`.
- `quote.edge_segment_removed`: Edge segment removed. Payload: `quoteId`, `areaId`, `measurementId`, `customerId`, `actorUserId`.
- `quote.sink_cutout_added`: Sink cutout added. Payload: `quoteId`, `areaId`, `measurementId`, `customerId`, `actorUserId`.
- `quote.sink_cutout_updated`: Sink cutout updated. Payload: `quoteId`, `areaId`, `measurementId`, `customerId`, `actorUserId`, `changedFields[]`.
- `quote.sink_cutout_removed`: Sink cutout removed. Payload: `quoteId`, `areaId`, `measurementId`, `customerId`, `actorUserId`.

Minimum event payload fields:
- `eventId`: UUID
- `occurredAt`: ISO 8601 UTC timestamp
- `version`: integer
- `data.quoteId`: UUID
- `data.customerId`: UUID
- `data.actorUserId`: UUID

Events involving line items also include:
- `data.lineItemId`: UUID

Events involving quote areas also include:
- `data.areaId`: UUID

Events involving quote measurements also include:
- `data.areaId`: UUID
- `data.measurementId`: UUID

## Planned Moraware Parity Expansion

This section is planning guidance, not current v1 API contract. Implement only after OpenAPI, DB invariants, domain schemas, migrations, and harness tests are added.

### Quote Measurements MVP

This is the next build slice. It exists to answer field questions like:

- How many physical pieces are in the kitchen?
- What are the dimensions of each counter run?
- Where is the sink/cutout?
- How much countertop square footage, finished edge linear footage, splash square footage, sink cutouts, and faucet holes exist?

Source audit:

- `docs/moraware-countergo-audit.md`
- `docs/moraware-live-gap-analysis-2026-05-16.md`

Moraware behavior to preserve first:

- A blank quote opens into drawing/measurement editor after creation.
- `Other Counter` supports structured entry before full visual CAD:
  - counter name
  - size by square footage or by measurement
  - splash height/length
  - edge length
  - add curves/bumpouts
  - add splash/edge
  - add sinks/cutouts
- `Custom Sink` supports quantity, model name, price, discount flag, sink type, shape, cutout dimensions, faucet hole count.

Domain primitives added in `@stoneboyz/domain`:

- `CounterPieceInput`
- `EdgeSegmentInput`
- `SinkCutoutInput`
- `QuoteMeasurementAreaInput`
- `QuoteMeasurementAreaTotals`
- `QuoteMeasurementTotals`

Canonical units:

- Linear measurements are inches.
- Area calculations return square feet.
- Edge calculations return linear feet.
- UI should round display inputs to nearest 1/16 inch by default, but calculators keep decimal values.

Calculator rules:

- `roundInches(value, 'nearest_1_16')`: round to nearest sixteenth inch.
- `countertopSqFt = lengthIn * widthIn * quantity / 144`.
- `finishedEdgeLinFt = sum(finished edge lengthIn / 12)`.
- `splashSqFt = sum(edge lengthIn * splashHeightIn / 144)`.
- `pieceCount = sum(piece.quantity)`.
- `sinkCutoutCount = sum(sink.quantity)`.
- `faucetHoleCount = sum(sink.quantity * sink.faucetHoleCount)`.
- Calculator outputs round to 3 decimals for operational totals.

Supported MVP values:

- Edge treatments: `unfinished`, `finished`, `appliance`, `mitered`, `waterfall`.
- Corner treatments: `none`, `radius`, `clip`, `bump_out`, `notch`.
- Sink types: `undermount`, `drop_in`, `farm`.
- Sink shapes: `rectangle`, `oval`, `double`, `60_40`, `40_60`, `70_30`, `30_70`.
- Sink centerline: `none`, `left`, `right`, `center`.
- Faucet hole count: integer 0 through 5.

First acceptance scenario:

1. Create quote area `Kitchen`.
2. Add piece `Sink run`, `100 in x 25.5 in`, quantity 1.
3. Add piece `Island`, `72 in x 36 in`, quantity 1.
4. Add front finished edges for 100 in and 72 in.
5. Add 4 in splash on 100 in back run.
6. Add undermount rectangle sink model `3018`, cutout `29 in x 18 in`, centerline `center`, one faucet hole.
7. Totals must be:
   - piece count: 2
   - countertop square footage: 35.708
   - finished edge linear footage: 14.333
   - splash square footage: 2.778
   - sink cutout count: 1
   - faucet hole count: 1

### New entities to specify

- `QuoteArea`: room/area such as Island, Master Bath, Laundry/Desk; owns material/color/edge selections and area subtotal.
- `DrawingRevision`: immutable snapshot of structured drawing data after save/send/accept.
- `CounterPiece`: one physical counter shape inside an area; owns dimensions and orientation.
- `EdgeSegment`: one measurable edge with length in inches, edge/splash treatment, and generated linear-foot quantities.
- `CornerTreatment`: one corner modification; type `none`, `radius`, `clip`, `bump_out`, or `notch`; stores radius/length/depth in inches as needed.
- `SinkCutout`: sink/cutout data with model, sink type, shape, cutout dimensions, faucet hole count, centerline, rotation, and area placement.
- `CooktopCutout`: appliance cutout data with dimensions and placement.
- `FaucetHole`: explicit faucet/accessory hole when it needs independent placement from a sink.
- `PriceList`: named customer/account-facing pricing catalog.
- `PriceListRevision`: immutable set of product/rate rules used by a quote.
- `GeneratedPriceLine`: price line produced from drawing/material/rule source metadata.
- `ManualQuoteLine`: manually added misc or text item.
- `PriceOverride`: actor/reason/timestamp audit for changing a generated or price-list rate.

### Business rules to preserve

- Canonical measurement unit for counters is inches. UI may display fractions rounded to nearest 1/16 inch.
- Generated area totals come from structured pieces, edge segments, splashes, cutouts, sinks, faucet holes, and selected material.
- Per-area subtotals must reconcile with quote subtotal.
- Generated price lines are reproducible from drawing revision plus price list revision.
- Overrides never mutate price list revisions; they attach to quote price lines with audit metadata.
- Manual misc/text lines are allowed but must be visibly separate from generated lines.
- Sent/accepted quote revisions must remain auditable even after later draft revisions.
- Destructive drawing actions require confirmation and should produce recoverable revision history.

### Harness requirements

- Domain golden tests for measurement rounding, square footage, linear footage, splash quantity, cutout count, faucet count, and generated pricing.
- Integration tests for quote area CRUD, drawing revision save, price generation, override creation, and manual item creation.
- Browser/E2E tests for the six-step quote flow: dimensions, curves/bumpouts, splash/edge, sink/cooktop, color/edge, price details.
- Fixture must include Island and Laundry/Desk areas from `docs/moraware-countergo-audit.md`.

## Open Questions

1. Should quotes be viewable by the customer via a public share link (e.g. PDF or web preview)?
2. Should `quoteNumber` reset per year or be globally sequential across all years?
3. Should discount be per-line-item or header-level only? (Currently specified as header-level only.)
4. Should an accepted quote auto-create a project if no `projectId` is set?
5. Should rejected quotes be re-openable (back to draft)? Currently not allowed.

## Pricing Generator

### Overview
Converts QuoteMeasurementAreaTotals (from Phase 1 calculator) into deterministic generated price lines by matching canonical price categories against the active price list.

### Canonical Price Categories (PRICE_CATEGORY_VALUES)
material | fabrication | finished_edge | splash | sink_cutout | sink_item | faucet_hole

Price list items must use these exact keys (case-insensitive match). Un-matchable categories produce no line.

### Generator Rules
- Pure function: generatePriceLines(totals, area, priceListItems): GeneratedPriceLine[]
- One line per canonical category, in canonical order
- Line generated only if: measured quantity > 0 AND matching price list item exists
- lineTotalCents = Math.round(quantity * unitPriceCents)
- material label = area.material if set, else 'Material'
- Categories without a price list item are silently skipped

### Data Model: generated_price_lines table
Keyed by quote_area_id. Regenerated on each measurement mutation. Columns:
- id uuid PK
- quote_area_id uuid FK → quote_areas(id) ON DELETE CASCADE
- category text NOT NULL — one of PRICE_CATEGORY_VALUES
- label text NOT NULL
- quantity numeric NOT NULL
- unit text NOT NULL
- unit_price_cents integer NOT NULL
- line_total_cents integer GENERATED ALWAYS AS (ROUND(quantity * unit_price_cents)) STORED
- price_list_item_id uuid NULL FK → price_list_items(id) ON DELETE SET NULL
- sort_order integer NOT NULL DEFAULT 0
- override_price_cents integer NULL
- override_reason text NULL
- override_by_user_id uuid NULL FK → users(id) ON DELETE SET NULL
- override_at timestamptz NULL
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()

### Acceptance Scenario (Golden)
Kitchen area from Phase 1 (countertopSqFt:35.708, finishedEdgeLinFt:14.333, splashSqFt:2.778, sinkCutoutCount:1, faucetHoleCount:1) with price list (material=2000¢, fabrication=1500¢, finished_edge=800¢, splash=1200¢, sink_cutout=15000¢, faucet_hole=5000¢) produces 6 lines with correct lineTotalCents.

### PriceListRevision Snapshots
Deferred to Phase 3 (alongside DrawingRevision). Phase 2 generates against live price list.
