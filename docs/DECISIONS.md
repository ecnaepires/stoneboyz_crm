# DECISIONS.md

Architectural decisions. Add entry before adding any new dependency or changing a pattern.

Format:
```
## [YYYY-MM-DD] Decision title
**Status:** Accepted | Superseded by [link]
**Why:** reason
**Alternatives considered:** what was rejected and why
**Consequences:** what this locks in
```

---

## [2026-05-05] Monorepo with pnpm workspaces

**Status:** Accepted
**Why:** Single repo for API, Web, and shared packages. Eliminates version drift between `packages/domain` and consumers. pnpm workspaces are faster than npm or yarn for monorepos.
**Alternatives considered:** Separate repos; rejected because shared types would require a publish cycle for every change.
**Consequences:** All apps share one `node_modules` graph. pnpm is the standard package manager for contributors.

---

## [2026-05-05] NestJS for API

**Status:** Accepted
**Why:** Structured module system enforces boundaries. Decorator-based DI makes testing straightforward. Strong TypeScript support and large ecosystem.
**Alternatives considered:** Fastify; rejected because it is lighter but lacks the same module and DI structure. Express; rejected because it is too unstructured for this team.
**Consequences:** NestJS modules are the authority in the API layer. `packages/domain` stays framework-free.

---

## [2026-05-05] Next.js for Web

**Status:** Accepted
**Why:** App Router and server components reduce client bundle size and give room for a BFF pattern if needed.
**Alternatives considered:** Remix; rejected for lower ecosystem maturity in this context. Vite SPA; rejected because SSR would be lost.
**Consequences:** React Server Components are enabled. Client components must be explicit.

---

## [2026-05-05] PostgreSQL 15+

**Status:** Accepted
**Why:** JSONB for flexible fields, UUID generation with `gen_random_uuid()`, strong ACID guarantees, and solid tooling.
**Alternatives considered:** MySQL; rejected for weaker JSON support. MongoDB; rejected because schema-less data makes CRM invariants harder to enforce.
**Consequences:** Queries can use PostgreSQL-specific features. Cross-database portability is not a goal.

---

## [2026-05-05] OpenAPI-first API design

**Status:** Accepted
**Why:** `docs/specs/api/openapi.yaml` drives generation of `packages/api-client`. One contract reduces client/server drift.
**Alternatives considered:** Code-first decorators; rejected because the spec becomes a derived artifact and is harder to review as a contract.
**Consequences:** API changes require spec updates first. `packages/api-client` is generated and never hand-edited.

---

## [2026-05-05] Cursor-based pagination

**Status:** Accepted
**Why:** Offset pagination breaks under inserts and deletes during traversal. Cursor pagination is stable for changing CRM lists.
**Alternatives considered:** Offset pagination; rejected because it is simpler but wrong for real-time operational data.
**Consequences:** List endpoints return `{ data, nextCursor, hasMore }`. No `page` parameter on paginated endpoints.

---

## [2026-05-05] Soft deletes for customer data

**Status:** Accepted
**Why:** CRM data has audit requirements. Hard deletes lose history. `deleted_at` preserves records while hiding them from normal queries.
**Alternatives considered:** Hard deletes; rejected for compliance and audit reasons.
**Consequences:** Customer-facing tables filter `WHERE deleted_at IS NULL` by default. Product and API language may say "archive", but database schema uses `deleted_at`.

---

## [2026-05-05] Zod for runtime validation

**Status:** Accepted
**Why:** API boundaries need runtime validation in addition to TypeScript types. Zod works well with TypeScript-first schemas and shared domain constants.
**Alternatives considered:** class-validator; rejected because validation becomes decorator-coupled to framework classes. Yup; rejected because TypeScript inference is weaker for this repo style.
**Consequences:** Request and response validation schemas live close to shared domain definitions. New packages may depend on `zod` once app scaffolding begins.

---

## [2026-05-05] Vitest for TypeScript tests

**Status:** Accepted
**Why:** Vitest runs TypeScript tests with minimal setup and is fast enough for early TDD loops.
**Alternatives considered:** Jest; rejected for heavier configuration in this bootstrap phase. Node test runner; rejected because TypeScript ergonomics are weaker without extra wiring.
**Consequences:** Root `pnpm test` runs Vitest. Spec checks stay available through `pnpm test:spec`.

---

## [2026-05-05] Docker Compose for local PostgreSQL

**Status:** Accepted
**Why:** Docker Compose gives reproducible dev and test databases without manual Windows PostgreSQL setup.
**Alternatives considered:** Installing PostgreSQL directly on Windows; rejected because local service, path, and password setup creates avoidable beginner friction.
**Consequences:** Local DBs start through `docker compose` wrappers in `package.json`. Test DB uses a separate container and port.

---

## [2026-05-05] Plain SQL migration bootstrap

**Status:** Accepted
**Why:** Plain SQL migrations are easy to inspect while the schema is small and keep database behavior explicit.
**Alternatives considered:** Knex migrations; deferred until application query-builder choice is made. Prisma migrations; rejected for now because the project is OpenAPI/spec-first and not ORM-first.
**Consequences:** Migration files live in `db/migrations/`. Helper scripts in `scripts/db/` run migrations for local test setup.

---

## [2026-05-05] pg for database test plumbing

**Status:** Accepted
**Why:** `pg` is the standard low-level PostgreSQL client for Node.js and is enough for reset scripts and integration smoke tests.
**Alternatives considered:** ORM client; rejected until API persistence pattern is chosen.
**Consequences:** Test scripts may use `pg` directly. Application code should still choose a query builder or ORM before repository implementation.

---

## [2026-05-10] In-process domain events via EventEmitter2

**Status:** Accepted
**Why:** v1 single-process; durability not yet required; aligns with NestJS ecosystem.
**Alternatives considered:** outbox pattern (deferred until multi-service); raw nodejs EventEmitter (rejected - no wildcard subscribers, no async support).
**Consequences:** events emitted post-commit, fire-and-forget; emission failures logged but NOT re-thrown; switch to outbox when add second service consumer.

---

## [2026-05-12] openapi-typescript + openapi-fetch for API client codegen

**Status:** Accepted
**Why:** Spec-first design (already locked in [2026-05-05] OpenAPI-first) needs a generator. `openapi-typescript` emits one types file from `docs/specs/api/openapi.yaml`; `openapi-fetch` is a ~3KB type-safe fetch wrapper that consumes those types. Pure TypeScript toolchain — no Java, no runtime classes, no codegen of service files. Spec changes regenerate types, and `tsc` then surfaces every breakage in `apps/web` and tests. Tree-shakable; works in Next.js server components and the browser.
**Alternatives considered:**
- `openapi-generator-cli` (OpenAPITools): rejected — requires Java runtime, generates verbose class-based SDK, harder to keep slim for a TS-only repo.
- `@hey-api/openapi-ts`: rejected — heavier output with service files we don't need; opinionated structure.
- `orval`: rejected — couples to React Query at generation time; we want client to stay framework-agnostic.
- `kubb`: rejected — newer, smaller community; plugin model overkill for our scope.
**Consequences:**
- `packages/api-client/` contains generated `src/schema.ts` (types) plus a hand-written `src/index.ts` that re-exports types and a `createClient()` factory wrapping `openapi-fetch`.
- `pnpm -C packages/api-client generate` runs `openapi-typescript ../../docs/specs/api/openapi.yaml -o src/schema.ts`.
- No OO `customersApi.list()` — callers use `client.GET("/customers", { params: { query: {...} } })`. Trade ergonomics for zero generated boilerplate.
- `packages/api-client/src/schema.ts` is generated; never hand-edit (already in CLAUDE.md non-negotiables).
- If web team later wants React Query hooks, layer on top — `openapi-fetch` plays well with TanStack Query / SWR.
