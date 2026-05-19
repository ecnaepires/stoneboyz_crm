# Stoneboyz CRM Todo

Use this as the working project checklist.

## Current Status

- [x] Define repo rules and workflow
- [x] Create customers module spec
- [x] Align archive language with DB soft-delete rules
- [x] Add first customer events to event catalog
- [x] Add first customer OpenAPI endpoints
- [x] Create root spec-check harness
- [x] Scaffold `packages/domain`
- [x] Add root TypeScript typecheck script
- [x] Build Customers vertical slice: API, DB, events, tests, web CRUD
- [x] Build Projects vertical slice: API, DB, events, tests, web CRUD
- [x] Add Better Auth email/password flow in web app
- [x] Generate typed API client from OpenAPI
- [x] Build Quotes vertical slice: API, DB, events, tests, generated client
- [x] Audit Moraware CounterGo/Systemize workflows for replacement parity
- [x] Create Moraware parity roadmap

## Right Now

- [x] Enable `pnpm` locally with Corepack
- [x] Scaffold `apps/api` package
- [x] Add `zod` schemas for customer request/response validation in `packages/domain`
- [x] Add TypeScript typecheck script
- [x] Create integration test harness for API + PostgreSQL test DB
- [x] Write first integration tests for customers list/create/get
- [x] Implement first NestJS customer endpoints

## Phase 1: Foundation

- [x] Write `CLAUDE.md`
- [x] Write `docs/CODEBASE_RULES.md`
- [x] Write `docs/DECISIONS.md`
- [x] Write `docs/PROMPTS.md`
- [x] Create root `package.json`
- [x] Create `pnpm-workspace.yaml`
- [x] Create `tsconfig.base.json`
- [x] Create spec sync script
- [x] Create harness notes in `docs/testing/HARNESS.md`

## Phase 2: Customers Spec

- [x] Define customer purpose
- [x] Define customer entities
- [x] Define customer business rules
- [x] Define customer events
- [x] Define first customer API endpoints
- [ ] Resolve remaining open questions in `docs/specs/modules/customers.md`
- [ ] Decide whether `taxId` is required for active customers
- [ ] Decide whether notes are plain text only in v1
- [ ] Decide restore permissions and archive permissions
- [ ] Decide whether `source`, `industry`, and `tags` are free-text or controlled lists

## Phase 3: Shared Domain

- [x] Create customer constants
- [x] Create customer shared types
- [x] Add customer Zod schemas
- [x] Export domain modules from stable entrypoints
- [x] Add domain-level tests once runtime schemas exist

## Phase 4: API Contract

- [x] Add `GET /customers`
- [x] Add `POST /customers`
- [x] Add `GET /customers/{customerId}`
- [ ] Review OpenAPI naming and examples
- [x] Add `PATCH /customers/{customerId}`
- [x] Add `POST /customers/{customerId}/archive`
- [x] Add `POST /customers/{customerId}/restore`
- [x] Add contact endpoints to OpenAPI
- [x] Add address endpoints to OpenAPI
- [x] Add note endpoints to OpenAPI
- [x] Regenerate `packages/api-client` after generator setup exists
- [x] Add project endpoints to OpenAPI

## Phase 5: Database

- [x] Choose migration tool approach for repo bootstrap
- [x] Create first customers migration
- [x] Create contacts migration
- [x] Create addresses migration
- [x] Create notes migration
- [x] Create projects migration
- [ ] Document customer module invariants in `docs/specs/db/invariants.md`
- [x] Create reproducible seed data

## Phase 6: API Implementation

- [x] Scaffold NestJS app in `apps/api`
- [ ] Configure environment loading
- [ ] Configure DB connection
- [x] Implement customer repository/service/controller flow
- [x] Return typed error responses
- [x] Emit customer events after transaction commit
- [x] Add archive behavior using `deleted_at`
- [x] Cascade-archive contacts when customer archived (tx + events)
- [x] Cascade-archive addresses, notes, and projects when customer archived
- [x] Implement project repository/service/controller flow
- [x] Pass actorUserId to DELETE contact/address/note endpoints

## Phase 7: Test Harness

- [x] Add `tests/integration/` runner setup
- [x] Add PostgreSQL test database setup script
- [x] Add migration reset script for tests
- [x] Add seed loading for tests
- [x] Add first customer integration tests
- [x] Add event emission tests
- [x] Add project integration tests
- [ ] Add coverage reporting

## Phase 8: Web

- [x] Scaffold Next.js app in `apps/web`
- [x] Generate and wire API client
- [x] Build customer list screen
- [x] Build customer create form
- [x] Build customer detail screen
- [x] Add archive/restore UI
- [x] Add search/filter UI
- [x] Add customer edit and subresource CRUD UI
- [x] Add auth sign-in/sign-up pages and middleware gate
- [x] Build project list/create/detail/edit screens
- [ ] Add richer sort/filter controls beyond current basics
- [ ] Add browser/E2E smoke tests for web flows

## Phase 9: Next Modules After Customers

- [x] Create jobs/projects module spec
- [x] Create quotes/estimates module spec
- [x] Build first projects module vertical slice
- [x] Create scheduling/calendar module spec
- [x] Create inventory/slabs module spec
- [ ] Create invoices/payments module spec if client needs it

## Phase 10: Moraware Parity Rebuild

- [x] Capture Moraware quote, drawing, pricing, job, fabrication, forms, calendar, settings, and reports in `docs/moraware-countergo-audit.md`
- [x] Create parity roadmap in `docs/specs/moraware-parity-roadmap.md`
- [ ] Upgrade quote spec for quote areas/rooms, drawing revisions, counter pieces, edge segments, corner treatments, sinks, faucet holes, generated price lines, overrides, and manual items
- [ ] Add quote drawing calculator domain tests: rounding to 1/16 inch, sq ft, linear ft, splash quantities, cutout/faucet counts
- [ ] Add price engine spec: price lists, revisions, product rules, fabrication rules, edge/splash/cutout/faucet rules, override audit
- [ ] Add pricing calculator golden tests using Island and Laundry/Desk sample
- [ ] Decide whether production jobs are a new `jobs` module or an expansion of `projects`
- [ ] Add production jobs spec: job number, job info, job activities, activity types/statuses, assignees, job forms, templates/processes, job issues
- [ ] Add fabrication integration tests: create job activity, schedule Tentative Fabrication, assign worker, change status, complete
- [ ] Add configurable forms spec: Job Checklist, Order Area Details, field types, dropdown custom values, linked order/area fields
- [ ] Add calendar/dispatch spec: fabrication/install/template views, filters, batch update, map, print packet
- [ ] Add admin configuration spec: measurement defaults, edge profiles, sink catalog, price lists, email templates, PDF forms, activity config
- [ ] Add reports spec: installed sq ft by month, jobs by salesperson, install sq ft by week, sales by month
- [ ] Add browser/E2E harness for quote create/edit/detail and fabrication schedule workflows
- [ ] Add visual/DOM checks for dense quote and job screens

## Weekly Review

- [ ] Review open questions with client
- [ ] Review completed tasks
- [ ] Reorder backlog based on customer feedback
- [ ] Confirm next smallest shippable slice

## Notes

- Build smallest working slice first: customers list, create, detail
- Do not start app code before domain schemas and integration harness are ready
- Keep spec first, then contract, then DB, then implementation, then tests
