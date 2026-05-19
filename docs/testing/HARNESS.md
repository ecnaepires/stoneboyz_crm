# Test Harness

This repo is spec-first and harness-first. A feature is not done until the spec and at least one executable harness prove the behavior.

Current runnable gates:
- `pnpm spec:check`
- `pnpm typecheck`
- `pnpm typecheck:web`
- `pnpm test:integration`
- `pnpm test`

`pnpm spec:check` verifies contract alignment across:
- `docs/specs/modules/customers.md`
- `docs/specs/modules/projects.md`
- `docs/specs/modules/quotes.md`
- `docs/specs/modules/scheduling.md`
- `docs/specs/modules/inventory.md`
- `docs/specs/moraware-parity-roadmap.md`
- `docs/specs/events/catalog.v1.yaml`
- `docs/specs/api/openapi.yaml`
- `docs/specs/db/invariants.md`
- required domain package files

Generated API client code in `packages/api-client` must come from `docs/specs/api/openapi.yaml`.

## Harness Layers

### Spec Sync

Use `pnpm spec:check`.

This catches missing docs, event catalog drift, missing OpenAPI paths/schemas, missing domain files, and required Moraware-parity anchors.

When adding a module, event family, or major workflow:
- Add the module spec.
- Add OpenAPI paths/schemas if the API changes.
- Add event catalog entries if events emit.
- Add DB invariants if schema changes.
- Add checks to `scripts/check-spec-sync.mjs`.

### Domain Unit Tests

Use co-located `*.test.ts` or `*.spec.ts` inside `packages/domain/src/`.

Required for pure business logic:
- status transition rules
- measurement rounding to 1/16 inch
- square footage and linear footage math
- splash quantity math
- sink/cutout/faucet count math
- price generation and override rules

### Integration Tests

Use `tests/integration/`.

Rules:
- Do not mock PostgreSQL.
- Use the separate test database.
- Reset database before each test file or suite.
- Run migrations before tests.
- Seed only data each test needs.
- Assert API response and key DB state when behavior depends on persistence.

### Browser/E2E Tests

Use `tests/e2e/` once workflow UI exists.

Required before Moraware-parity UI is called done:
- quote create/edit/detail flow
- quote area measurement flow
- edge/splash/sink/faucet flow
- generated pricing and override flow
- quote accept -> job creation/attach flow
- fabrication schedule flow
- job checklist/order-area form flow
- calendar fabrication view flow

### Visual/DOM Checks

Dense operational screens need visual or DOM assertions:
- no overlapping text or controls
- key action buttons visible in expected states
- tables preserve important columns at desktop width
- mobile view does not hide required actions without a replacement path

## Moraware-Parity Golden Seed

Add a reusable test fixture for a Stoneboyz sample:
- customer/account with contact and address
- quote with Island and Laundry/Desk areas
- dimensions using fractional inches
- radius, clip, bump out, notch
- finished edge, 4 inch splash, mitered edge, waterfall, unfinished edge
- undermount sink, faucet holes, centerline
- generated material/fabrication/edge/splash/cutout/sink/faucet price lines
- one override and one manual misc/text item
- accepted quote linked to production job
- Fabrication activity with Tentative status, 2 hour duration, assignee, notes
- Job Checklist and Order Area Details forms

## Local Tooling

This repo standardizes on pnpm. If `pnpm` is not installed, enable it with Corepack:

```powershell
corepack enable
corepack prepare pnpm@9.15.0 --activate
```
