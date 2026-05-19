# CLAUDE.md

This file provides guidance to Claude Code/ Codex (claude.ai/code) when working with code in this repository.

## Session Protocol (Non-Negotiable)

### Model discipline
- **Default model: Sonnet.** Escalate only when task warrants it.
- Before ANY task declare: `Model: <Sonnet|Opus> — effort: <low|medium|high|xhigh>`
- **Opus** → hard design, security review, tricky debug, teaching moments, tradeoff calls
- **Sonnet** → delegation briefs, test runs, memory updates, diff spot-checks, status answers
- Before Opus-level work: say exactly **"Switch to Opus now — effort: \<level\>"** and WAIT. Do not proceed until user confirms.
- Once design done and execution starts: say **"Drop to medium now"** or **"Switch to Sonnet now"**.

### Codex model budget gate
- Before substantial Codex work, recommend the cheapest safe model and effort.
- Say exactly: `Recommended Codex: gpt-5.x — effort: <low|medium|high|xhigh> — why: <one short reason>`.
- If the current model is stronger than needed, explicitly say the user can drop down before continuing.
- Use `gpt-5.3-codex` or `gpt-5.4-mini` for reads, status, small edits, log updates, simple test fixes, and narrow one-file changes.
- Use `gpt-5.4` for normal feature work, straightforward refactors, API/web wiring, and test additions with known patterns.
- Use `gpt-5.5` only for hard architecture, tricky debugging, high-risk multi-module changes, security-sensitive work, or fuzzy tasks needing deep judgment.
- Default effort: low for status/reads, medium for normal implementation, high/xhigh only when complexity or risk is explicit.
- If unsure, start cheaper and escalate only after explaining the reason.

### Claude hard gate
- Before any tool call, file read, plan, edit, or test, Claude MUST print:
  ```
  Model: <Sonnet|Opus> -- effort: <low|medium|high|xhigh>
  Mode: <Plan|Execution|Review>
  Why: <one short reason>
  ```
- If Claude forgets this header, stop and restart with the header before continuing.
- Default: Sonnet + low effort for status, simple reads, command runs, memory/log updates, and delegation briefs.
- Default: Sonnet + medium effort for normal planning, review, and implementation coordination.
- Ask user before Opus or high/xhigh effort.
- Opus/high/xhigh only for hard architecture, security review, tricky debugging, teaching moments, or important tradeoff calls.

### Plan mode default
- Claude stays in Plan mode until user explicitly approves implementation.
- Claude does not write code directly unless user explicitly asks Claude to code.
- Claude plans and reviews; Codex implements.
- When implementation is needed, Claude hands exact files/scope/tests to Codex.
- After Codex finishes, Claude reviews diff and test results before next step.

### Codex delegation (default for ALL file edits)
- Claude plans + reviews. Codex executes. No exceptions unless 1-2 line fix on a file already read this turn.
- **Codex model: choose by budget gate.** Invocation: `codex exec -m <recommended-model> --skip-git-repo-check --sandbox workspace-write`
- **State effort in every brief.** Format: `Effort: <low|medium|high|xhigh>` on its own line after the caveman block.
- Every Codex brief MUST open with this block (no exceptions):
  ```
  COMMUNICATION STYLE: respond caveman mode. Drop articles/filler/hedging. Fragments OK.
  Report format: [thing] [action] [reason]. Terse. Technical terms exact. Code unchanged.
  Effort: <low|medium|high|xhigh>
  ```
- Every Codex brief MUST close with: "After completing the task, append a `[codex]` entry to `COLLAB_LOG.md` summarizing what/why/files/result."

### Caveman mode
- Claude: caveman full, always (session hook enforces).
- Codex: inject caveman block at TOP of every brief — no exceptions.

## Identity

B2B CRM. Stack: NestJS (API, port 3001) + Next.js 15 App Router (Web, port 3000) + PostgreSQL + TypeScript strict monorepo.

## Commands

```bash
# Dev
pnpm db:up             # start dev Postgres on 5432 (Docker)
pnpm dev               # start API + Web concurrently
pnpm dev:api           # API only (builds first)
pnpm dev:web           # Web only (waits for API health check)

# Tests
pnpm test                                                 # all vitest suites
pnpm test:integration                                     # integration only (requires test DB)
pnpm test tests/integration/customer-api.test.ts          # single file
pnpm test -- --grep "should create customer"              # single test by name
pnpm test:spec                                            # validate docs/specs/ matches code

# Type checking
pnpm typecheck         # domain package
pnpm typecheck:web     # web package

# Test DB
pnpm db:test:up        # start test Postgres on 5433 (tmpfs, ephemeral)
pnpm db:test:reset     # nuke + re-migrate test DB

pnpm db:down           # stop all Docker DB services
```

## Quick Dashboard Launch

- For "open the dashboard in the app browser", do the shortest working path instead of debugging Chrome extension flow.
- Use the in-app browser already attached to the thread. Do not prefer the Chrome extension backend unless the user explicitly asks for Chrome.
- Background dev servers launched inside the sandbox may die immediately. If the dashboard must stay open, start long-running API/web processes outside the sandbox.
- Fast path:
  1. Start API from `apps/api`: `node --env-file=.env dist/main.js`
  2. Start web from repo root: `pnpm -C apps/web dev`
  3. Poll `http://localhost:3001/api/v1/health` and `http://localhost:3000/dashboard`
  4. Navigate the in-app browser directly to `http://localhost:3000/dashboard`
- Avoid `pnpm dev` for simple browser access unless both combined logs are actually needed. Separate API/web startup is easier to verify and recover.

## Codex In-App Browser Access

- Use the `browser` skill for any request to inspect, click, type, screenshot, or work with the user's in-app browser.
- The browser control surface is the Node REPL JavaScript tool, not a browser-named tool.
- Read the skill first if needed: `C:\Users\Lenovo 02\.codex\plugins\cache\openai-bundled\browser\0.1.0-alpha2\skills\browser\SKILL.md`
- Bootstrap once per fresh Node REPL session:

```js
if (!globalThis.agent) {
  const { setupBrowserRuntime } = await import(
    "C:/Users/Lenovo 02/.codex/plugins/cache/openai-bundled/browser/0.1.0-alpha2/scripts/browser-client.mjs"
  );
  await setupBrowserRuntime({ globals: globalThis });
}
if (!globalThis.browser) {
  globalThis.browser = await agent.browsers.get("iab");
}
await browser.nameSession("Browser assist");
if (typeof tab === "undefined") {
  globalThis.tab = await browser.tabs.selected();
}
```

- After bootstrap, inspect current tab with `await tab.url()`, `await tab.title()`, `await tab.playwright.domSnapshot()`, or `await nodeRepl.emitImage(await tab.screenshot({ fullPage: false }))`.
- Do not reload the user's tab unless needed; it can wipe in-progress drawing state. If the tab is already on the target URL, inspect it in place.
- Prefer Playwright DOM locators for normal UI. For canvas/drawing work, use screenshots plus `tab.cua.click`, `tab.cua.drag`, and coordinates.
- To make the browser visible during paired work, call `await (await browser.capabilities.get("visibility")).set(true)`.

## Monorepo Layout

```
apps/api          NestJS backend
apps/web          Next.js frontend
packages/domain   shared types, enums, pure logic — ZERO framework deps
packages/api-client  generated OpenAPI client — NEVER hand-edit src/schema.ts
db/migrations     plain SQL, append-only
db/seeds          reproducible seed data
docs/specs        source of truth: openapi.yaml, events catalog, module specs
tests/            integration/ and e2e/ harnesses
scripts/          CI and DB automation helpers
```

## Module Coupling

```
apps/api       → packages/domain   ✓
apps/web       → packages/domain   ✓
apps/web       → packages/api-client ✓
packages/domain → nothing external ✓
apps/api       → packages/api-client ✗  (never)
```

## Architecture

**API** (NestJS): `AppModule` registers `databaseProvider` (pg.Pool), feature modules for customers/contacts/addresses/notes, `EventsModule` (EventEmitter2). Each module follows controller → service → repository. Repositories own raw SQL. Services own business logic and emit domain events post-commit.

**Web** (Next.js App Router): Server components fetch via `packages/api-client` (openapi-fetch wrapper). Client components are explicit. Path alias `@/*` → `src/*`.

**API client**: `client.GET("/customers", { params: { query: {...} } })` — no generated service methods. Callers use path strings directly. `createClient()` factory is in `packages/api-client/src/index.ts`.

**Pagination**: List endpoints return `{ data, nextCursor, hasMore }`. Cursor-based only — no `page` parameter.

**Events**: Emitted post-commit, fire-and-forget. Emission failures are logged but NOT re-thrown. Pattern: `entity.action` (e.g., `customer.created`).

**Soft deletes**: `deleted_at` column on all customer-facing tables. All queries default `WHERE deleted_at IS NULL`. API/product language says "archive"; DB uses `deleted_at`.

## Non-Negotiable Rules

1. **Spec first.** No endpoint, event, or DB change without updating `docs/specs/` first.
2. **Domain package is pure.** Zero framework imports in `packages/domain`.
3. **Never hand-edit `packages/api-client/src/schema.ts`.** Regenerate: `pnpm -C packages/api-client generate`.
4. **One migration per PR.** Migrations append-only. Create corrective migrations instead of editing shared ones.
5. **No magic strings.** Status codes, roles, event names live in `packages/domain` as enums/consts.
6. **Tests required.** New feature = new test in `tests/integration/`.
7. **Moraware parity is source-backed.** Read `docs/moraware-countergo-audit.md` and `docs/specs/moraware-parity-roadmap.md` before quote/job/fabrication/calendar/admin work.
8. **Harness before done.** Measurement/pricing logic needs domain tests; API behavior needs integration tests; user workflows need browser/E2E coverage.

## Workflow for New Features

1. Update `docs/specs/modules/<module>.md`
2. Update `docs/specs/api/openapi.yaml` if API changes
3. Update `docs/specs/events/catalog.v1.yaml` if events change
4. Update `docs/specs/db/invariants.md` and `scripts/check-spec-sync.mjs` if schema/contracts change
5. Write migration if schema changes
6. Add domain/unit tests for pure logic
7. Implement in `apps/api` or `apps/web`
8. Write tests in `tests/integration/`
9. Add browser/E2E coverage for workflow UI
10. Regenerate `packages/api-client` if API changed

## Naming Conventions

- Files: `kebab-case.ts`
- Classes: `PascalCase`, functions: `camelCase`, constants: `SCREAMING_SNAKE_CASE`
- DB tables: `snake_case` (plural), API routes: `/kebab-case/:id`
- Events: `entity.action`

## Integration Test Pattern

Tests hit a real DB (port 5433). No mocking. Bootstrap `NestJS TestingModule`, connect pg.Pool to test DB, run migrations in `beforeEach`, assert on both API response and DB rows directly.

## Code Style

- TypeScript strict mode everywhere; explicit return types on public functions
- Errors are typed — no throwing raw strings
- Dates: UTC, ISO 8601
- No `any` without an explanatory comment
- New dependencies require a `docs/DECISIONS.md` entry first

## Environment

- Node 20+, pnpm 9.15.0 (required), PostgreSQL 15+
- Two Docker services: `postgres` (5432 dev) and `postgres_test` (5433 test, tmpfs)
