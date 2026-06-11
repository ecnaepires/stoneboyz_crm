# Price List Builder Implementation Plan

> **Superseded for next work:** The first slice was implemented, but the quote-level model changed. Future implementation should follow [Price Catalog And Quote Pricing Selections](../specs/2026-06-04-price-catalog-and-quote-selections-design.md), not the old “one Price List per quote” assumption.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Price List Builder slice: editable active price lists, grouped price-list items, company-wide item catalog reuse, and pricing generation that can use item charge method and measurement basis.

**Architecture:** Evolve the existing `price_lists` / `price_list_items` system instead of replacing it. Add catalog persistence and new pricing fields while preserving old `category`, `item_type`, and `unit` compatibility for existing quote pricing. Update dashboard UI to use salesperson language.

**Tech Stack:** TypeScript, Zod, NestJS, PostgreSQL SQL migrations, Next.js server components/actions, Vitest integration tests.

---

## File Map

- `db/migrations/055_price_list_item_catalog.sql`: add company-wide item catalog and new item fields.
- `packages/domain/src/price-lists/price-list.types.ts`: expose group/item/charge-method/measurement-basis fields.
- `packages/domain/src/price-lists/price-list.schemas.ts`: validate new fields.
- `packages/domain/src/quotes/quote-pricing.types.ts`: add charge method and measurement basis to generation input.
- `packages/domain/src/quotes/quote-pricing.ts`: calculate line quantity from measurement basis.
- `packages/domain/src/quotes/quote-pricing.test.ts`: domain tests for new pricing behavior.
- `apps/api/src/price-lists/price-list.mapper.ts`: map new DB fields.
- `apps/api/src/price-lists/price-list-items.repository.ts`: create catalog entries and save new fields on price list items.
- `apps/api/src/price-lists/price-list-items.service.ts`: allow active price-list item edits.
- `apps/api/src/price-lists/price-lists.repository.ts`: allow active price-list metadata edits.
- `apps/api/src/price-lists/price-lists.service.ts`: remove draft-only update rule.
- `apps/api/src/quotes/quote-pricing.service.ts`: pass new pricing fields into domain generation.
- `tests/integration/price-lists.test.ts`: active edit and catalog reuse tests.
- `tests/integration/quote-pricing.test.ts`: generated lines from measurement basis fields.
- `apps/web/src/app/price-lists/[id]/page.tsx`: grouped builder UI.
- `apps/web/src/app/price-lists/_actions.ts`: form parsing for group/item/charge method/measurement basis/rate.
- `docs/specs/api/openapi.yaml`: contract fields for price-list items.

## Tasks

### Task 1: Backend Contract And Persistence

- [ ] Add failing integration tests proving active price lists can be edited and new item fields round-trip.
- [ ] Add migration `055_price_list_item_catalog.sql`.
- [ ] Update domain price-list types and schemas.
- [ ] Update mapper/repository/service to save and return new fields.
- [ ] Run `pnpm test:integration tests/integration/price-lists.test.ts`.
- [ ] Commit backend contract slice.

### Task 2: Catalog Reuse

- [ ] Add failing integration test proving a newly created item appears in catalog-backed item rows and can be reused.
- [ ] Add catalog repository behavior inside price-list item creation.
- [ ] Run focused integration test.
- [ ] Commit catalog slice.

### Task 3: Measurement-Basis Pricing

- [ ] Add failing domain tests for custom measurement basis.
- [ ] Update `generatePriceLines` to use `chargeMethod` and `measurementBasis`.
- [ ] Update quote-pricing service to pass new item fields.
- [ ] Update integration pricing setup to use new fields while keeping old categories compatible.
- [ ] Run `pnpm test packages/domain/src/quotes/quote-pricing.test.ts tests/integration/quote-pricing.test.ts`.
- [ ] Commit pricing slice.

### Task 4: Dashboard Builder UI

- [ ] Replace raw add-item grid with grouped salesperson builder.
- [ ] Keep existing server action endpoints.
- [ ] Allow editing active price lists in UI.
- [ ] Run `pnpm typecheck:web`.
- [ ] Commit UI slice.

### Task 5: Contract And Verification

- [ ] Update OpenAPI price-list item schemas.
- [ ] Run `pnpm typecheck`.
- [ ] Run focused integration tests.
- [ ] Run web typecheck.
- [ ] Final cleanup and status report.
