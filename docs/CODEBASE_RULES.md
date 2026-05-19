# CODEBASE_RULES.md

Rules enforced always. No exceptions without DECISIONS.md entry.

---

## Module Boundaries

| From -> To | Allowed? |
|-----------|----------|
| `apps/api` -> `packages/domain` | YES |
| `apps/web` -> `packages/domain` | YES |
| `apps/web` -> `packages/api-client` | YES |
| `apps/api` -> `packages/api-client` | NO |
| `packages/domain` -> anything else | NO |
| `apps/api` -> `apps/web` | NO |

## Naming Conventions

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants/enums: `SCREAMING_SNAKE_CASE`
- Database tables: `snake_case`, plural (`customers`, `pipeline_stages`)
- Database columns: `snake_case`
- API routes: `/kebab-case/:id`
- Event names: `entity.action` - e.g. `customer.created`, `deal.stage_changed`

## TypeScript Rules

- `strict: true` in all tsconfigs
- No `any` without `// reason: <explanation>`
- Prefer `unknown` over `any` for external data
- Zod for runtime validation at API boundaries
- Shared types defined in `packages/domain`, imported everywhere

## API Rules

- All endpoints documented in `docs/specs/api/openapi.yaml` before implementation
- Request/response shapes validated with Zod schemas derived from domain types
- Errors return `{ code: string, message: string, details?: unknown }`
- HTTP status codes follow RFC 9110 strictly
- Pagination always cursor-based, never offset for lists > 100

## Database Rules

- Migrations are sequential and append-only after they are shared
- Every table has `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Every table has `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Soft deletes via `deleted_at TIMESTAMPTZ NULL` - never hard delete customer data
- Product/API language says "archive"; DB language stays `deleted_at`
- Foreign keys always explicit with ON DELETE policy documented
- No raw SQL in application code - use query builder or ORM

## Event Rules

- All events catalogued in `docs/specs/events/catalog.v1.yaml`
- Events are immutable once published - add new event type instead of changing existing
- Event payload always includes `{ eventId, occurredAt, version, data }`

## Spec-Driven Rules

- `docs/moraware-countergo-audit.md` is the source audit for legacy parity.
- `docs/specs/moraware-parity-roadmap.md` is the source roadmap for replacing Moraware with a better Stoneboyz workflow.
- No Moraware-parity feature starts from code. Flow is audit note -> module spec -> OpenAPI/events/DB invariants -> domain schemas -> migration -> implementation -> harness.
- New modules or new event families must be added to `scripts/check-spec-sync.mjs` in the same change as the spec.
- Every spec addition must include business rules, invalid states, open questions, and at least one acceptance scenario.
- Planned-but-not-implemented behavior must be labeled clearly in specs so API clients do not treat it as shipped.

## Harness-Driven Rules

- Every feature needs at least one automated harness before it is considered done.
- API and DB behavior uses real PostgreSQL integration tests under `tests/integration/`.
- Pure business math uses domain/unit tests before API code: measurement rounding, square footage, linear footage, splash quantities, price generation, and quote totals.
- Web workflow changes need browser/E2E coverage once the flow is beyond static display.
- Generated clients, OpenAPI, event catalog, DB invariants, domain constants, and module specs must stay in sync through `pnpm spec:check`.
- Moraware-parity flows must use sample quote/job fixtures that cover areas, measurements, edges, sinks, faucet holes, generated pricing, overrides, fabrication scheduling, and job forms.

## Testing Rules

- Unit tests: `*.spec.ts` co-located with source
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`
- No mocking the database in integration tests - use test DB
- Seed data from `db/seeds/` for reproducible tests
- Coverage threshold: 80% lines for `apps/api`, 70% for `apps/web`

## Git Rules

- Branch naming: `feat/`, `fix/`, `chore/`, `docs/`, `db/`
- One concern per PR
- PR must include: what changed, why, how to test
- Squash merge to main
- Never force-push main
