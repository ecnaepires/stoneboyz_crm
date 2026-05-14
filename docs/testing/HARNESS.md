# Test Harness

This repo starts with spec checks before application code exists.

Current runnable gate:
- `npm test`
- `pnpm test`
- `pnpm spec:check`

`pnpm spec:check` verifies that first customer module contracts stay aligned across:
- `docs/specs/modules/customers.md`
- `docs/specs/events/catalog.v1.yaml`
- `docs/specs/api/openapi.yaml`
- `docs/specs/db/invariants.md`

## When API Code Starts

Before implementing the first NestJS endpoint, add:
- shared domain types and enums in `packages/domain/src/`
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- API test runner config
- `tests/integration/` setup for a real PostgreSQL test database
- script to run migrations against test DB
- seed data from `db/seeds/`

Integration tests must not mock PostgreSQL.

## When Web Code Starts

Before implementing the first Next.js screen, add:
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- web test runner config
- e2e browser test setup under `tests/e2e/`

Generated API client code in `packages/api-client` must come from `docs/specs/api/openapi.yaml`.

## Local Tooling

This repo standardizes on pnpm. If `pnpm` is not installed, enable it with Corepack:

```powershell
corepack enable
corepack prepare pnpm@9.15.0 --activate
```
