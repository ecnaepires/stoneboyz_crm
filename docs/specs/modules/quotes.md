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
- `lengthMm`: integer, nullable
- `widthMm`: integer, nullable
- `thicknessMm`: integer, nullable (common values: 20, 30)
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

Minimum event payload fields:
- `eventId`: UUID
- `occurredAt`: ISO 8601 UTC timestamp
- `version`: integer
- `data.quoteId`: UUID
- `data.customerId`: UUID
- `data.actorUserId`: UUID

Events involving line items also include:
- `data.lineItemId`: UUID

## Open Questions

1. Should quotes be viewable by the customer via a public share link (e.g. PDF or web preview)?
2. Should `quoteNumber` reset per year or be globally sequential across all years?
3. Should discount be per-line-item or header-level only? (Currently specified as header-level only.)
4. Should an accepted quote auto-create a project if no `projectId` is set?
5. Should rejected quotes be re-openable (back to draft)? Currently not allowed.
