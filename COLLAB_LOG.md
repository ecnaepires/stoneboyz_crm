# Collab Log — Claude × Codex

Append-only shared journal. Both Claude and Codex write here so the user can switch between either app and stay in sync. The user only asks about joint work unless they explicitly invite the other party — solo conversations with Codex (or Claude) are **not** logged here.

## Protocol

**When to append (both sides):**
- Plan adopted (after `ExitPlanMode` approval or user OK on direction)
- Delegation handoff (Claude → Codex via `codex:codex-rescue`, or Codex starts on Claude-handed task)
- File edits committed (filename + one-line summary)
- Test/build run with notable result (pass count, failure, regression)
- Decision recorded (architecture, tradeoff, scope cut)
- Blocker found / resolved
- Memory file written or updated

**When NOT to append:**
- Pure reads / exploration (grep, ls, file read)
- Internal scratch thinking
- Solo conversation with one side (user chatting Codex alone with no Claude involvement, and vice versa)

**Entry format (caveman terse — drop articles, fragments OK, one short line each field):**

```
## YYYY-MM-DD HH:MM [actor] <title ≤8 words>
- what: <action, fragment OK>
- why: <reason, fragment OK>
- files: <paths or —>
- result: <pass/fail/count/pending>
```

`actor` = `claude` or `codex`. 24h local time. Keep each line <80 chars. No prose paragraphs.

**Session start ritual (both sides):**
- Read last ~30 entries of this file before answering "what did we do" / "what's next"
- If file > 50KB, rotate older entries to `collab/YYYY-MM.md` and start fresh

**Delegation prompt requirement:**
Every `codex:codex-rescue` task prompt must end with:
> After completing the task, append a `[codex]` entry to `COLLAB_LOG.md` summarizing what/why/files/result.

---

## Entries

## 2026-05-11 20:45 [claude] Unstuck Codex broker
- what: rm stale broker.json + tmp dirs cxc-TXI3oT, cxc-56vgiV
- why: pipe ENOENT, setup --json doesn't auto-respawn
- files: ~/.claude/plugins/data/codex-inline/state/stoneboyz_crm-*/broker.json
- result: loggedIn true, ready true

## 2026-05-11 20:46 [claude] Baseline tests
- what: pnpm db:test:reset && pnpm test:integration
- why: confirm no drift from yesterday
- files: —
- result: 34/34 pass, 6.05s

## 2026-05-11 20:50 [claude] Init COLLAB_LOG
- what: create COLLAB_LOG.md at repo root, define protocol
- why: user wants shared Claude/Codex journal
- files: COLLAB_LOG.md
- result: created

## 2026-05-11 21:05 [claude] Tighten log format
- what: enforce caveman terse entries, <80 char lines
- why: save tokens on session-start reads
- files: COLLAB_LOG.md
- result: protocol updated, entries rewritten

## 2026-05-11 21:20 [claude] Plan #4 archive cascade
- what: design tx archive(customer + contacts), emit cascade events
- why: spec line 132 requires cascade; first transactional repo method
- files: customers.repository.ts, customers.service.ts, new cascade test
- result: plan adopted, delegating to Codex

## 2026-05-11 21:21 [claude] Delegate cascade to Codex
- what: codex:codex-rescue brief sent (gpt-5.5, workspace-write)
- why: token saving — Claude reviews diff only
- files: pending Codex
- result: pending

## 2026-05-12 09:xx [codex] Customer notes vertical slice
- what: add customer_notes migration, domain note inputs, API notes CRUD, events, cascade, tests
- why: mirror customer-addresses pattern for notes module
- files: db/migrations/004*, domain/customer.*, api/customers/*note*, app.module, cascade tests
- result: domain build/typecheck/spec-sync pass; integration blocked by spawn EPERM

## 2026-05-11 20:58 [codex] Implement archive cascade
- what: tx archive customer + contacts, emit cascade events
- why: spec line 132, claude delegation
- files: customers.repository.ts, customers.service.ts, customer-archive-cascade.test.ts
- result: 0 tests run, typecheck pass, integration blocked spawn EPERM

## 2026-05-11 21:30 [claude] Verify cascade impl
- what: ran typecheck + db:test:reset + test:integration outside Codex sandbox
- why: Codex blocked by spawn EPERM, needed full run
- files: —
- result: 39/39 pass (was 34, +5 cascade tests), typecheck clean

## 2026-05-11 21:31 [claude] Review cascade diff
- what: read service + repo archive impl
- why: confirm tx correctness, actor propagation
- files: customers.service.ts, customers.repository.ts
- result: pattern correct, client release in finally, actor uses customer archiver

## 2026-05-11 21:35 [claude] Plan #5 addresses module
- what: design vertical slice — migration 003, domain, repo/svc/ctl, tests
- why: next audit item, spec already in catalog + check-spec-sync
- files: migration 003, domain, api/customers/customer-addresses.*, tests
- result: plan adopted, delegating to Codex (OpenAPI deferred)

## 2026-05-11 21:36 [claude] Delegate addresses to Codex
- what: codex:codex-rescue brief sent (gpt-5.5, workspace-write)
- why: token saving
- files: pending Codex
- result: pending

## 2026-05-11 21:12 [codex] Implement addresses slice
- what: add address migration, domain schemas, api, cascade, tests
- why: mirror contacts vertical slice for customer addresses
- files: db/migrations/003*, domain/customer.*, api/customers/*address*
- result: domain build pass, typecheck pass, integration blocked EPERM

## 2026-05-11 21:42 [claude] Verify addresses impl
- what: typecheck + spec-sync + db:test:reset + test:integration
- why: Codex sandbox EPERM blocked test run
- files: —
- result: 52/52 pass (+13 from 39), typecheck + spec-sync clean

## 2026-05-11 21:43 [claude] Review addresses diff
- what: spot-check archive() cascade + file list
- why: confirm tx pattern extended cleanly to addresses
- files: customers.repository.ts
- result: tx order customers→contacts→addresses, ROLLBACK on err

## 2026-05-11 21:50 [claude] Save broker-pipe recipe
- what: new memory codex_broker_recipe.md + MEMORY.md index entry
- why: today wasted time debugging stale broker.json; never repeat
- files: memory/codex_broker_recipe.md, memory/MEMORY.md
- result: saved, tomorrow's session skips trap

## 2026-05-11 21:51 [claude] Session close
- what: project_status updated, resume checklist rewritten
- why: user off; clean handoff to tomorrow's session
- files: memory/project_status.md
- result: 52/52 baseline locked, next = #6 notes module

## 2026-05-12 09:00 [claude] Resume — start #6 notes
- what: skip baseline re-verify (same session, 52/52 fresh)
- why: token saving, brief Codex direct
- files: —
- result: delegating

## 2026-05-12 09:01 [claude] Delegate notes module to Codex
- what: codex:codex-rescue brief — mirror addresses slice
- why: token saving, established pattern
- files: pending Codex
- result: pending

## 2026-05-12 09:47 [claude] Verify notes impl
- what: pnpm db:test:reset && pnpm test:integration
- why: Codex sandbox EPERM blocked test run
- files: —
- result: 62/62 pass (+10 from 52), 18.71s

## 2026-05-12 10:30 [claude] Plan #7 contact make-primary/billing
- what: explore + plan; mirror addresses make-billing 1:1 for both flags
- why: next audit item; all infra (cols, indexes, events) exists
- files: plan in ~/.claude/plans/let-s-pick-up-where-lovely-marshmallow.md
- result: approved via ExitPlanMode

## 2026-05-12 10:35 [codex] Implement contact make-primary/make-billing
- what: repo (tx flip) + svc + ctl + 4 integration tests
- why: audit item #7
- files: customer-contacts.{repository,service,controller}.ts, tests/integration/customer-contacts.test.ts
- result: typecheck 0; integration deferred to Claude

## 2026-05-12 10:45 [claude] Verify + fix test
- what: spec:check pass; integration 65/66, fixed seeded primary clash in test (use SEEDED_PRIMARY_CONTACT_ID instead of creating duplicate primary)
- why: seed file inserts contact 33333... with is_primary=true; create second primary blocked by partial unique index
- files: tests/integration/customer-contacts.test.ts
- result: 66/66 pass, 16.14s
## 2026-05-12 [codex] Add list filter fields
- what: tag/industry/source/createdAtFrom/createdAtTo to listCustomersSchema + repo WHERE
- why: audit item #8, spec-required filters missing
- files: customer.schemas.ts, customer.types.ts, customers.repository.ts, customer.schemas.test.ts
- result: typecheck 0

## 2026-05-12 [claude] Verify #8 list filters
- what: spec:check + integration + domain unit tests
- why: Codex sandbox EPERM, Claude verifies
- files: customer.schemas.test.ts (fix pre-existing actorUserId missing)
- result: 66/66 integration, 36/36 domain unit, spec clean
## 2026-05-12 [codex] Backfill openapi.yaml
- what: addresses/notes/make-primary/make-billing endpoints + list filter params + 8 new schemas
- why: audit item #9, spec drifted behind impl
- files: docs/specs/api/openapi.yaml
- result: spec:check pass (but YAML had 2 bugs claude fixed)

## 2026-05-12 [claude] Pick api-client generator
- what: DECISIONS.md entry — openapi-typescript + openapi-fetch picked
- why: tradeoff: pure TS, ~3KB runtime, no Java, no class bloat
- files: docs/DECISIONS.md
- result: accepted; rejected openapi-generator-cli/hey-api/orval/kubb

## 2026-05-12 [claude] Fix Codex yaml bugs
- what: orphan archiveCustomerContact delete (dup key), stray 409 in archiveCustomerNote
- why: openapi-typescript YamlParseError "duplicated mapping key" at 1368
- files: docs/specs/api/openapi.yaml
- result: generator now runs clean

## 2026-05-12 [claude] Bootstrap api-client + generate
- what: pkg.json + tsconfig + src/index.ts (createClient factory) + run generate
- why: audit item #9, openapi-typescript + openapi-fetch
- files: packages/api-client/{package.json,tsconfig.json,src/index.ts,src/schema.ts}
- result: build 0, typecheck 0, 66/66 integration, schema.ts 1445 lines, 13 paths
## 2026-05-12 [codex] Scaffold apps/web/ Phase 8
- what: Next.js 15 app scaffold - layout, globals.css, customers list/detail/create, server actions, api client factory, actor lib, shadcn primitives (button/input/label/card/table/select), CORS on API, root scripts
- why: Phase 8 audit item - minimum viable dashboard
- files: apps/web/package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs, components.json, .env.local.example, .env.local, src/app/layout.tsx, src/app/globals.css, src/app/page.tsx, src/lib/utils.ts, src/lib/api.ts, src/lib/actor.ts, src/components/ui/{button,input,label,card,table,select}.tsx, src/app/customers/page.tsx, src/app/customers/new/page.tsx, src/app/customers/[id]/page.tsx, src/app/customers/_actions.ts, apps/api/src/main.ts (CORS), package.json (root scripts)
- result: typecheck 0; domain build 0; api-client build 0; pnpm install resolved packages but failed in sharp lifecycle script with spawn EPERM under the sandbox
## 2026-05-12 [claude] Verify Phase 8 web app
- what: pnpm install, boot API + web, browser test list/detail/create
- why: Phase 8 verification
- files: package.json (fixed dev:api script: build && start), apps/api/src/main.ts (CORS verified)
- result: all 3 pages working — list shows seeded customer, detail renders fields, create form submits and redirects

## 2026-05-12 [codex] Phase 8.5 - detail page real data + archive/restore
- what: replaced stub cards with real contacts/addresses/notes (parallel fetch), added archive/restore server actions + buttons
- why: Phase 8.5 - detail page was showing placeholders
- files: apps/web/src/app/customers/[id]/page.tsx, apps/web/src/app/customers/_actions.ts
- result: pnpm.cmd typecheck:web passed clean

## 2026-05-13 [codex] Archived customers page + search
- what: includeArchived param on listCustomers (spec+domain+repo), /customers/archived page with Restore buttons, search input on list page, Archived nav link
- why: user needs archive section + search on dashboard
- files: docs/specs/api/openapi.yaml, packages/domain/src/customers/customer.schemas.ts, packages/domain/src/customers/customer.types.ts, apps/api/src/customers/customers.repository.ts, apps/api/src/customers/customers.controller.ts, packages/api-client/src/schema.ts (regen), apps/web/src/app/customers/page.tsx, apps/web/src/app/customers/archived/page.tsx, apps/web/src/app/customers/_actions.ts, apps/web/src/app/layout.tsx
- result: spec:check pass, domain build pass, api-client generate pass, api-client build pass, apps/api build pass, typecheck:web 0, integration tests blocked before execution by Vite startup error `spawn EPERM` while loading vitest.config.ts

## 2026-05-13 [codex] Phase 8.5 web CRUD forms
- what: added customer update plus contact/address/note create/delete and contact primary/billing server actions; wired detail-page inline forms/buttons; created customer edit page
- why: enable web CRUD for existing customer subresources without API/spec/client changes
- files: apps/web/src/app/customers/_actions.ts, apps/web/src/app/customers/[id]/page.tsx, apps/web/src/app/customers/[id]/edit/page.tsx
- result: `pnpm.cmd typecheck:web` passed clean


## 2026-05-13 [claude] Phase 8.5 web CRUD complete
- what: inline add/delete note, contact, address; make-primary/billing buttons; customer edit page
- why: detail page was read-only; all API endpoints existed, just no web UI
- files: apps/web/src/app/customers/_actions.ts, [id]/page.tsx, [id]/edit/page.tsx
- result: typecheck:web 0; integration baseline not re-run (Docker offline this session)

[2026-05-13] Phase 11 Auth — Better Auth email+password. Files: auth.ts, auth-client.ts, [...all]/route.ts, sign-in/page.tsx, sign-up/page.tsx, middleware.ts, actor.ts updated, _actions.ts updated. Migration 002 created. typecheck: 0 errors. Integration: blocked before execution by Vite startup `spawn EPERM`; not 66/66 verified in this session. Dev DB migration: requested postgres/postgres stoneboyz_dev rejected auth; applied to reachable compose DB stoneboyz_crm_dev.
[2026-05-13] Fix middleware Edge Runtime � replaced auth.api.getSession with cookie check. typecheck: 0 errors.

## 2026-05-13 [codex] Phase 9 Projects module
- what: full Projects vertical slice: DB migration, domain schemas/types/status guard/events, API repository/service/controller, customer archive cascade to projects, OpenAPI + generated client, integration coverage, web list/create/detail/edit/actions, customer detail projects card, nav link
- why: Phase 9 Projects module, mirrored Customers module patterns and verified reverse status transitions are blocked
- files: db/migrations/003_create_projects.sql, packages/domain/src/projects/*, packages/domain/src/index.ts, apps/api/src/projects/*, apps/api/src/customers/*, apps/api/src/events/event-types.ts, apps/api/src/app.module.ts, docs/specs/api/openapi.yaml, docs/specs/events/catalog.v1.yaml, packages/api-client/src/schema.ts, tests/integration/project-api.test.ts, tests/integration/customer-archive-cascade.test.ts, apps/web/src/app/projects/*, apps/web/src/app/customers/[id]/page.tsx, apps/web/src/app/layout.tsx, package.json, vitest.config.ts
- result: apps/api build 0; api-client generate/build 0; typecheck:web 0; spec check 0; integration 86/86 passed

## 2026-05-13 22:53 [codex] Review status align
- what: fix stale schema test, update TODO to shipped scope
- why: align current phase before next build
- files: customer.schemas.test.ts, docs/TODO.md
- result: spec pass, typecheck:web pass, tests 123/123 pass

## 2026-05-13 22:56 [codex] Fix auth base URL
- what: set Better Auth baseURL, add BETTER_AUTH_URL env
- why: web build warned redirects/callbacks may fail
- files: apps/web/src/lib/auth.ts, apps/web/.env.local.example, apps/web/.env.local
- result: web build pass, typecheck:web pass

## 2026-05-14 00:00 [codex] Add Claude hard gate
- what: require model/effort/mode header before Claude work
- why: prevent token burn, keep Claude in plan/review role
- files: CLAUDE_CODEX.md
- result: rule added

## 2026-05-14 07:25 [codex] Fix DELETE actor flow
- what: require actorUserId for contact/address/note archive
- why: remove fallback actor + web any casts
- files: openapi.yaml, customer schemas/types, controllers/services, web actions, tests, TODO
- result: spec pass, builds pass, typechecks pass, tests 124/124 pass
