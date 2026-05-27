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

## 2026-05-18 10:55 [codex] One-piece Z counters
- what: add Z draw/save/render on single counter layout shape
- why: Moraware Step 1 supports L/Z chained counter drawing
- files: DrawingCanvasInner.tsx, _actions.ts, quote-drawing.*
- result: typecheck/spec/test pass; browser draw/reload pass

## 2026-05-18 09:46 [codex] One-piece L counters
- what: store L geometry on single counter layout shape
- why: Moraware treats L draw as one counter, not two pieces
- files: DrawingCanvasInner.tsx, _actions.ts, quote-drawing.*
- result: typecheck/spec/test pass; browser draw/reload pass

## 2026-05-18 09:32 [codex] Fix L save
- what: unwrap direct piece create response; apply notes migration
- why: second L leg stopped before layout save; DB save 500
- files: _actions.ts, 025_add_notes_to_drawing_revisions.sql
- result: typecheck:web pass; browser L draw/reload pass

## 2026-05-18 09:25 [codex] Group L counters
- what: add drawing groupId + grouped L render/save path
- why: keep L-shaped counter from behaving like loose rectangles
- files: quote-drawing.types.ts, quote-drawing.schemas.ts, DrawingCanvasInner.tsx, quote-drawing.controller.ts
- result: domain/api/web typecheck pass; browser drag automation blocked

## 2026-05-18 09:18 [codex] Preserve L draw layout
- what: save new drawn piece layout before refresh
- why: prevent L-shaped draw from auto-layout flattening
- files: apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx
- result: typecheck:web pass

## 2026-05-18 09:04 [codex] Start Step 6 parity
- what: add pricing shell inside editor with area totals and generated lines
- why: keep quote pricing in Moraware-style editor flow
- files: apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx, apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCard.tsx, apps/web/src/app/customers/[id]/quotes/[quoteId]/page.tsx
- result: typecheck:web pass, browser verify pass

## 2026-05-18 09:01 [codex] Start Step 5 parity
- what: add area editor panel in quote drawing Step 5
- why: collapse fragmented page into Moraware-style editor workflow
- files: apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCanvasInner.tsx, apps/web/src/app/customers/[id]/quotes/[quoteId]/DrawingCard.tsx, apps/web/src/app/customers/[id]/quotes/_actions.ts
- result: typecheck:web pass, browser verify pass

## 2026-05-18 08:53 [codex] Add model budget gate
- what: require cheapest safe Codex model + effort recommendation
- why: avoid token waste; only use 5.5 for hard work
- files: CLAUDE_CODEX.md
- result: rule added

## 2026-05-17 15:30 [codex] Audit third parity batch
- what: compare toolbar, revisions, save, exit, email/print flows
- why: capture muscle-memory details beyond geometry tools
- files: docs/moraware-live-gap-analysis-2026-05-16.md
- result: added 6 more parity findings

## 2026-05-17 15:28 [codex] Audit second parity batch
- what: compare Moraware steps 2-6 against CRM quote flow
- why: extend audit beyond counter dimensions into full editor model
- files: docs/moraware-live-gap-analysis-2026-05-16.md
- result: added 6 more parity findings

## 2026-05-17 15:26 [codex] Audit first parity batch
- what: compare Moraware editor shell + step 1 against CRM quote UI
- why: start strict parity audit with fix-ready findings
- files: docs/moraware-live-gap-analysis-2026-05-16.md
- result: added 6 concrete parity findings

## 2026-05-17 15:20 [codex] Moraware parity skill
- what: create moraware-parity-auditor skill + checklist
- why: compare CRM vs Moraware and produce fix-ready gaps
- files: ~/.agents/skills/moraware-parity-auditor/*
- result: quick_validate pass

## 2026-05-17 15:17 [codex] CounterGo strict parity notes
- what: record user must-haves + live Moraware verification list
- why: lock interaction parity requirements before implementation
- files: docs/moraware-live-gap-analysis-2026-05-16.md
- result: notes appended, six-step wizard verified in live tab

## 2026-05-17 15:04 [codex] Browser handoff recipe
- what: add in-app browser bootstrap recipe to CLAUDE_CODEX
- why: help Codex 5.3 use user browser via node_repl + iab
- files: CLAUDE_CODEX.md
- result: verified current quote tab URL via browser skill

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

## 2026-05-14 08:29 [codex] Scheduling vertical slice
- what: scheduled_events DB/domain/API/events/tests/client
- why: new Scheduling module vertical slice
- files: db/migrations/006*, domain/scheduling, api/scheduling, tests, client
- result: typecheck pass, api/client checks pass, integration 115/115 pass
## 2026-05-14 14:17 [claude] Phase 10 Quote Areas v1
- what: QuoteArea entity — DB migrations, domain types/schemas, API controller/service/repository/mapper/events, 14 integration tests
- why: Moraware parity roadmap #1 — quote rooms/areas foundation for pricing engine + orders
- files: db/migrations/011_create_quote_areas.sql, 012_add_quote_area_id_to_quote_line_items.sql, packages/domain/src/quotes/quote.types.ts, quote.schemas.ts, apps/api/src/quotes/quote-area.mapper.ts, quote-area-events.ts, quote-areas.repository.ts, quote-areas.service.ts, quote-areas.controller.ts, quote.mapper.ts, quotes.repository.ts, quotes.service.ts, app.module.ts, events/event-types.ts, tests/integration/quote-areas.test.ts, quotes.test.ts
- result: 133/133 integration pass (14 new), domain build 0, api build 0
## 2026-05-14 14:30 [claude] Phase 11 Orders module
- what: Orders + OrderPayments — DB migrations, domain types/schemas, API controller/service/repository/mapper/events, 15 integration tests
- why: Moraware parity roadmap #6 — convert accepted quote to order, track payments (cash/check/card), order number sequencing O-YYYY-NNN
- files: db/migrations/013_create_orders.sql, 014_create_order_payments.sql, packages/domain/src/orders/order.types.ts, order.schemas.ts, packages/domain/src/index.ts, apps/api/src/orders/order.mapper.ts, order-events.ts, orders.repository.ts, orders.service.ts, orders.controller.ts, apps/api/src/quotes/quotes.controller.ts, app.module.ts, events/event-types.ts, tests/integration/orders.test.ts
- fix: computePaymentStatus guard totalCents > 0 before marking paid (zero-total quote converted correctly stays unpaid)
- result: 148/148 integration pass (15 new), domain build 0, api build 0
## 2026-05-14 16:32 [claude+codex] Phase 12 Orders UI
- what: Orders web UI — list page, detail page with payments, convert-to-order button on quote detail
- why: Moraware parity — business needs to see orders and record payments in the browser
- files: docs/specs/api/openapi.yaml (+Order/OrderPayment schemas + 6 paths), packages/api-client/src/schema.ts (regen), apps/web/src/app/customers/[id]/orders/_actions.ts (new), customers/[id]/orders/page.tsx (new), customers/[id]/orders/[orderId]/page.tsx (new), customers/[id]/quotes/[quoteId]/page.tsx (+Convert to Order button), apps/web/src/lib/auth.ts (fix invalid Better Auth option blocking typecheck)
- result: typecheck:web 0 errors, integration 148/148 pass
## 2026-05-14 17:25 [claude+codex] Phase 14 Price Lists
- what: Price Lists admin module — DB migrations, domain types/schemas, API CRUD (controller/service/repository/mapper/events), 26 integration tests, OpenAPI spec + client regen, web UI (list/new/detail/edit pages + sidebar nav link)
- why: Moraware parity — admin catalog for countertop pricing rules (Materials, Fabrication, Edges, Sinks, etc.); unblocks pricing engine v2
- files: db/migrations/015_create_price_lists.sql, 016_create_price_list_items.sql, packages/domain/src/price-lists/ (4 files), apps/api/src/price-lists/ (9 files), events/event-types.ts, app.module.ts, domain/src/index.ts, openapi.yaml, api-client/schema.ts, apps/web/src/app/price-lists/ (5 files), layout.tsx
- result: 174/174 integration pass (26 new), typecheck:web 0 errors, spec:check pass

## 2026-05-15 10:22 [codex] API auth guard
- what: add Better Auth UUID IDs + API session guard helpers
- why: API needs real session auth, UUID FK compatibility
- files: auth.ts, api/src/auth/{public,current-user,session-auth}.ts
- result: api build 0, typecheck:web 0

## 2026-05-15 10:29 [codex] Global API auth
- what: wire SessionAuthGuard as APP_GUARD, mark health public
- why: enforce API session auth globally, keep health unauthenticated
- files: apps/api/src/app.module.ts, apps/api/src/health.controller.ts
- result: api build 0, boot ok, health 200, customers 401

## 2026-05-15 11:08 [codex] Phase 15 chunk 3 session actor
- what: removed actorUserId from mutation request schemas; controllers now derive actorUserId from @CurrentUser and merge it before service calls
- why: mutation actor must come from authenticated session, not client request bodies
- files: packages/domain/src/customers/customer.schemas.ts, packages/domain/src/quotes/quote.schemas.ts, packages/domain/src/orders/order.schemas.ts, packages/domain/src/price-lists/price-list.schemas.ts, packages/domain/src/projects/project.schemas.ts, packages/domain/src/scheduling/scheduled-event.schemas.ts, packages/domain/src/inventory/slab.schemas.ts, apps/api/src/customers/*controller.ts, apps/api/src/projects/projects.controller.ts, apps/api/src/quotes/{quotes,quote-areas}.controller.ts, apps/api/src/orders/orders.controller.ts, apps/api/src/price-lists/*controller.ts, apps/api/src/inventory/*controller.ts, apps/api/src/scheduling/scheduled-events.controller.ts
- result: domain build 0, pnpm typecheck 0, api build 0

## 2026-05-15 [claude+codex] Phase 15 API Authentication
- what: full API auth — SessionAuthGuard (cookie+bearer), @Public()/@CurrentUser() decorators, global APP_GUARD, actorUserId removed from 7 domain schemas + 59 controller handlers, Better Auth UUID user IDs, openapi.yaml security scheme, client regen, web _actions.ts cookie forwarding, test session-seed helper, 3 obsolete tests removed
- why: API had zero auth — any caller could forge actorUserId; guard now derives actor from Better Auth session; client-body trust debt eliminated
- files: apps/api/src/auth/*, app.module.ts, health.controller.ts, packages/domain/src/**/**.schemas.ts, 13 controllers, openapi.yaml, api-client/schema.ts, apps/web/src/lib/api.ts, 6 _actions.ts files, vitest.config.ts, tests/integration/helpers/auth.ts, tests/integration/helpers/test-auth.ts, 13 test files, COLLAB_LOG.md
- result: 171/171 integration pass, typecheck 0 errors, spec:check pass, /health 200 /customers 401
- bonus-fix: AppModule was missing databaseProvider — latent DI bug fixed; dev:api now boots cleanly

- 2026-05-17: Continued Moraware parity audit from live CounterGo tab. Added findings for mode-aware right rail, real Step 5 area/color workflow, Step 6 inline pricing worksheet/diagnostics, persistent area grouping, and stepper-as-workflow gating in docs/moraware-live-gap-analysis-2026-05-16.md.

- 2026-05-17: Added live Moraware parity findings for Step 2 corner-treatment markers, Step 3 edge-treatment canvas flow, Step 4 sink/cooktop placement workflow, and step-specific canvas grammar in docs/moraware-live-gap-analysis-2026-05-16.md.

- 2026-05-17: Verified live Moraware micro-interactions for Step 2/Step 1: floating corner treatment picker, Radius dialog with preview/default, Edge Length modal, Save & Next Edge advancing to the next segment, and visible 90-degree angle annotations during edge editing.

- 2026-05-17: Captured Moraware editor-shell and Step 3 parity details: revision browser/revert modal, revision-note save flow, unsaved exit guard, full splash/edge contextual menu, custom splash-height dialog, and additional finished-edge labels (F1/F2).

- 2026-05-17: Final audit pass captured quote-detail drawing auto-correction warning, quote-level pricing error banner behavior, and documented that Step 4 sink/cooktop micro-interactions still need a richer Moraware sample for absolute maximum parity coverage.

- 2026-05-17: Added docs/specs/moraware-countergo-editor-implementation-plan.md to convert the live Moraware audit into phased implementation work, file targets, acceptance checks, and the recommended first coding slice.

- 2026-05-17: Expanded Phase 0 plan with concrete API/data changes, web state shape, modal behavior, tests, and 5.4 coding order for CounterGo editor shell parity.

- 2026-05-17: Implemented Phase 0 CounterGo editor shell groundwork: drawing revision notes/list/revert API, web save/revert actions, Moraware-style drawing toolbar, save/revisions/exit modals, dirty-state guard, and on-piece rotate/duplicate/delete menu foundation.

- 2026-05-17: Added Phase 1 edge-length editing foundation in the quote drawing canvas: clickable measurement labels, Edge Length modal, Save and Save & Next Edge flow, selected-piece 90-degree annotations, and browser verification on the live quote page.

- 2026-05-17: Added Step 2 Curves & Bumpouts foundation: drawing layout now persists corner treatments, canvas shows clickable corner markers, and Edit Corner modal supports Radius, Clip, Bump Out, Notch, None, Save, and Save & Next Corner. Verified on live quote page without saving job changes.

- 2026-05-17: Added Step 3 Splash & Edge foundation: drawing layout now persists edge treatments, Step 3 shows per-edge F markers on each piece, and a new edge-treatment modal supports splash heights, finished/appliance/mitered/waterfall/unfinished, additional finished edge labels, and Save & Next Edge.

- 2026-05-17: Expanded Step 4 Sink & Cooktop foundation: sinks are now piece-bound in drawing layout, Step 4 shows an Add Sink entrypoint and sink selection tray, piece clicks can place selected sinks, placed sinks are draggable on-canvas, and sink context actions now support remove-from-counter and delete.

- 2026-05-18 [codex]: Fixed Step 1 chained drawing lower-run parity. `DrawingCanvasInner.tsx` now anchors the lower tail at the first vertical turn and measures continuation in the original horizontal direction, matching the observed Moraware right/down/right flow. Appended live gap notes to `docs/moraware-live-gap-analysis-2026-05-16.md`. Result: `pnpm typecheck:web` passed.

- 2026-05-18 [codex]: Added generic chained counter shape for repeated Moraware stair-step drawing. Preview and saved chain shapes now render as one union outline instead of separate stroked rectangles, removing internal orange split lines. Domain drawing schema now accepts `chain` shape segments and tests cover persistence. Result: `pnpm typecheck:web`, `pnpm typecheck`, and quote-drawing schema test passed.

[2026-05-20] Moraware recording parity pass. Imported user recordings into `output/moraware-recordings`, extracted frame contact sheet, reviewed finished CounterGo drawings. Updated `DrawingCanvasInner.tsx` with compound-shape perimeter dimension labels for L/Z/chain outlines and CounterGo-style right-rail shortcut hints plus keyboard bindings (`N/Y/E/Z/J/K/L/M`). Verification: `pnpm typecheck:web` passed; local `/sign-in` returns 200 and `/customers` redirects unauthenticated.

[2026-05-20] Moraware video 01:04 review follow-up. No geometry rewrite. Adjusted drawing visual state so inactive counters render as clean white outlines and selected counters get pale green fill, matching CounterGo's selected-piece behavior from the user recording. Verification: `pnpm typecheck:web` passed.

[2026-05-20] Added first direct dimension edit behavior for chain drawings. Clicking a compound measurement opens Edge Length with that measurement value, and saving updates the corresponding chain segment width/height in drawing layout and saves the layout. Verification: `pnpm typecheck:web` passed.

- 2026-05-20 [codex]: Fixed chained counter resize parity from user Moraware recording. `DrawingCanvasInner.tsx` now detects chain segment attachments and moves downstream connected runs with the edited dimension so L/Z pieces stay joined instead of separating. Appended parity note to `docs/moraware-live-gap-analysis-2026-05-16.md`. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Reviewed latest CRM/Moraware resize video. Fixed chain edge length math so inner perimeter labels use the clicked boundary length as the delta baseline instead of the whole outer segment length, preventing inside edits from shrinking only the outside. Converted quote drawing route to viewport full-page overlay with top-right Exit and expanded canvas height. Verification: `pnpm -C apps/web typecheck` passed; browser metrics showed full viewport overlay 1600x900 and canvas 1440x674.

- 2026-05-20 [codex]: Matched Moraware Edge Length dialog styling in the CRM drawing workspace. Edge length modal is now compact with green header, X close, focused length input, inch marker, Save & Next Edge/Save buttons, and a mini counter preview highlighting the selected edge with orange arrows. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Began Moraware continuation-arrow parity from user screenshots. Added hover highlight for compound dimension labels and selected-piece continuation arrows on chained counters; clicking an arrow appends a new 36-inch run from the selected free end and persists the drawing revision/piece bounds. Angle-degree transforms were identified as next slice because current drawing schema only persists axis-aligned chain rectangles. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Adjusted compound dimension hover to match user preference: only the dimension number changes color on hover; guide line, ticks, and arrows stay gray while invisible hit area remains for easy clicking. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Fixed tiny compound edge dimension labels. Lowered hidden-edge threshold from 4 inches to 1 inch so Moraware-style short notch segments, e.g. 3 inches, display on the drawing. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Added Moraware-style internal depth dimensions for chained vertical legs. CRM now draws a clickable inner 25 1/2-inch-style guide on vertical chain runs, with text-only hover highlight and Edge Length editor wiring for that depth. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Tuned internal depth dimension styling. Centered the chain inner-depth 25 1/2-inch label in the vertical leg, darkened default dimension text, restored hover to orange, and added a small orange-tinted hover rectangle behind the inner-depth label while keeping guide lines gray. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Centered dimension label boxes and standardized label rendering. Added shared `DimensionLabel` renderer with white backing gap over measurement lines, orange hover rectangle/text, centered text, and applied it to simple, compound, and internal chain dimensions. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Moved internal chain depth dimension labels outside the green countertop outline so label backing does not cut piece/edge lines. Rule preserved: label backing can interrupt dimension guide lines, not countertop edge lines. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Corrected dimension label placement after screenshot review. Boundary dimension labels now sit farther away from green countertop outlines so their white backing does not gray/cut piece corners, and internal 25 1/2-inch labels are centered on their gray measurement guide line again. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Added tiny-edge-only label offset in `boundaryGuide`. Horizontal perimeter dimensions 6 inches or shorter now place their label farther away from the edge, preventing a 3-inch label from sitting on top of the green countertop outline. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Moved tiny horizontal perimeter dimension labels sideways off the green edge line. For labels 6 inches or shorter, `boundaryGuide` now positions the label outside the short segment horizontally as well as away from the guide, so a 3-inch label cannot sit on top of a countertop edge. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Tuned tiny edge label distance. Reduced short horizontal label side offset from 24px to 12px so 3-inch labels stay close enough to read as connected to the short segment while still off the green countertop line. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Refined tiny dimension label treatment. Short perimeter labels now float without default white backing, get a small gray leader line to the measured edge, and retain orange hover box. `DimensionLabel` now has optional backing so labels that cross gray dimension guides still get a white gap, while tiny labels near green edges do not cover the countertop outline. Verification: `pnpm -C apps/web typecheck` passed.

- 2026-05-20 [codex]: Removed tiny-dimension leader line and default label backing. Dimension numbers now float centered on their guide line; gray guide lines split into two segments around the text so they do not strike through labels. Hover box remains orange and unchanged. Verification: `pnpm -C apps/web typecheck` passed.

## 2026-05-20 14:09 [codex] Connect rectangle edges
- what: allow Connect tool on simple rectangle counters
- why: tablet measure flow needs two-edge rectangle close
- files: DrawingCanvasInner.tsx
- result: web typecheck pass; drawingGeometry 9/9 pass

## 2026-05-20 14:16 [codex] Harden connect taps
- what: allow Connect on L/Z edges; ignore same-edge double tap
- why: tablet measure connect should not no-op or make slivers
- files: DrawingCanvasInner.tsx
- result: web typecheck pass; drawingGeometry 9/9 pass

## 2026-05-20 14:21 [codex] Drawing tools harden
- what: reject zero-area connect; edit L/Z edge segments as chain
- why: Laser tablet flow needs solid edge/offset/connect/delete
- files: DrawingCanvasInner.tsx, drawingGeometry.*
- result: web/domain typecheck pass; drawingGeometry 10/10 pass

## 2026-05-20 14:34 [codex] Offset no-grow
- what: Offset creates cabinet + green guide lines, no filled strip
- why: user wants offset guide first, connect later; piece not bigger
- files: DrawingCanvasInner.tsx, drawingGeometry.*
- result: web/domain typecheck pass; drawing/schema tests pass

## 2026-05-20 14:37 [codex] Laser-style menu
- what: right rail now shows Erase/Distance/Fillet/Offset/etc
- why: match Laser drawing edit command menu
- files: DrawingCanvasInner.tsx
- result: web typecheck pass; drawing/schema tests pass

## 2026-05-20 14:48 [codex] Erase removes surface
- what: erased-edge pieces hide old fill until Segment reconnects
- why: deleted line means old surface gone, then rebuilt as new piece
- files: DrawingCanvasInner.tsx
- result: web typecheck pass; drawing/schema tests pass

## 2026-05-20 14:50 [codex] Erase whole piece
- what: deleting final visible boundary edge deletes counter piece
- why: all four sides erased means piece is gone
- files: DrawingCanvasInner.tsx
- result: web typecheck pass; drawing/schema tests pass
## 2026-05-20 14:59 [codex] Drawing menu and dimensions cleanup
- what: add Pen/Cursor return tools; make Fill It use connect; hide deleted-edge dimensions; remove Std/90 labels
- why: Laser tablet workflow needs clear mode switching and no stale/duplicate measurements
- files: DrawingCanvasInner.tsx
- result: web typecheck pass; drawing/schema tests pass

## 2026-05-21 [claude] Plan V2 drawing workspace architecture
- what: strategic reset — scrapped incremental edits to DrawingCanvasInner; designed V2 with Konva + pure domain package
- why: 7,328-line monolith untestable; chain model already proven, just needs porting
- files: docs/specs/drawing/{_template,glossary,slice-0-foundation,tools/draw-shape}.md
- result: specs approved; Slice 0 delegated to Codex

## 2026-05-22 [codex] Slice 0 — domain port + Konva shell
- what: ported chain-shape model to packages/domain/src/drawing/; built ?v2=1 Konva workspace shell
- why: unlock pure-testable geometry; all later V2 slices depend on this
- files: packages/domain/src/drawing/{types,geometry,topology,index,geometry.test,topology.test}.ts, apps/web/.../drawing-v2/{DrawingWorkspace,canvas/Stage,canvas/PieceLayer}.tsx, apps/web/.../drawingGeometry.ts (re-export), edit/page.tsx (?v2=1 guard), apps/web/package.json (+konva,react-konva)
- open-q answers: func at :1391 = resizeChainSegments; domain pkg = @stoneboyz/domain; grid = Konva <Line> per quarter-inch
- result: domain typecheck 0; 5/5 parity tests pass; web typecheck 0; no framework imports in domain; gates 8/9/12 browser-verified

## 2026-05-22 [codex] Slice 1 - Draw Shape tool
- files touched: packages/domain/src/drawing/constants.ts; packages/domain/src/drawing/geometry.ts; packages/domain/src/drawing/index.ts; packages/domain/src/index.ts; packages/domain/src/drawing/geometry.test.ts; apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-v2/state/workspace-store.ts; apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-v2/tools/DrawShapeTool.tsx; apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-v2/canvas/PreviewLayer.tsx; apps/web/src/app/customers/[id]/quotes/[quoteId]/drawing-v2/DrawingWorkspace.tsx; COLLAB_LOG.md
- gate results: domain tests 1-5 pass 5/5, fail 0/5; geometry.test.ts overall 10/10 pass; browser gates 6-12 handler-wired, not live-tested
- verification: domain tsc pass via `pnpm --filter @stoneboyz/domain exec tsc -p tsconfig.json --noEmit`; web tsc pass via `pnpm --filter @stoneboyz/web exec tsc -p tsconfig.json --noEmit`; domain React-import grep returned zero hits
- (a) buildChainFromClicks as standalone pure function confirmed Y
- (b) DEFAULT_COUNTER_DEPTH_IN source = hardcoded constant (option a)
- assumption: `apps/web/package.json` does not include zustand and package edits were outside the allowed file list, so workspace-store uses a dependency-free React external-store implementation with zustand-like selector/actions.

## 2026-05-25 [codex] Realign issue and attachment enums
- what: added migrations 049/050; updated domain issue type, attachment category, and attachable type values
- why: DB constraints and domain schemas need current Issue/Attachment taxonomy
- files: db/migrations/049_realign_issue_types.sql, db/migrations/050_realign_attachment_categories.sql, packages/domain/src/issues/issue.types.ts, packages/domain/src/attachments/attachment.types.ts
- result: `npx tsc -p packages/domain/tsconfig.json --noEmit` pass, 0 errors

## 2026-05-25 [codex] Customer note edit endpoint
- what: wired CustomerNote PATCH body edit through controller, service, repository, domain input, DB edited_at column, regenerated API client
- why: customer notes had list/create/archive coverage but edit path needed body update support
- files: apps/api/src/customers/customer-notes.controller.ts, apps/api/src/customers/customer-notes.service.ts, apps/api/src/customers/customer-notes.repository.ts, packages/domain/src/customers/customer.types.ts, db/migrations/051_add_edited_at_to_customer_notes.sql, packages/api-client/src/schema.ts
- result: `pnpm test 2>&1 | tail -5` pass, 301 tests

## 2026-05-25 [codex] Job, quote, and activity note UI
- what: added CRUD note sections to job, quote, and activity detail pages with server actions for add/delete
- why: note APIs existed, web pages needed CustomerNote-style forms/lists; quote notes expose public/internal state
- files: apps/web/src/app/projects/[id]/page.tsx, apps/web/src/app/projects/[id]/_actions.ts, apps/web/src/app/customers/[id]/quotes/[quoteId]/page.tsx, apps/web/src/app/customers/[id]/quotes/[quoteId]/_actions.ts, apps/web/src/app/customers/[id]/events/[eventId]/page.tsx, apps/web/src/app/customers/[id]/events/[eventId]/_actions.ts
- result: `pnpm typecheck:web 2>&1 | tail -10` pass, 0 errors

## 2026-05-25 [codex] Job checklist toggles
- what: added first active phase checklist fetch, checkbox toggle UI, and PATCH server action
- why: checklist API existed per phase; project detail page needed editable job checklist state
- files: apps/web/src/app/projects/[id]/page.tsx, apps/web/src/app/projects/[id]/_actions.ts, apps/web/src/app/projects/[id]/checklist-toggle.tsx
- result: `pnpm typecheck:web 2>&1 | tail -5` pass, 0 errors

## 2026-05-25 10:47 [codex] Portal job status
- what: add phase/activity fields to portal quote + status card
- why: customer portal needs current/upcoming job progress
- files: portal.service.ts, openapi.yaml, schema.ts, portal page
- result: web typecheck pass, 0 errors

## 2026-05-25 11:15 [codex] Drawing V2 depth edit
- what: added Slice 2 depth edit for selected chain segments; horizontal depth updates `h`, vertical depth updates `w`, simple downstream attachment moves with the depth delta
- why: per-segment `widthIn` override was the narrow next step after Draw Shape; length/reflow edit remains separate
- files: packages/domain/src/drawing/topology.ts, packages/domain/src/drawing/topology.test.ts, packages/domain/src/index.ts, apps/web/.../drawing-v2/state/workspace-store.ts, apps/web/.../drawing-v2/tools/EditDepthTool.tsx, apps/web/.../drawing-v2/DrawingWorkspace.tsx, docs/specs/drawing/{glossary,tools/edit-edge}.md
- result: domain typecheck pass; topology tests 3/3 pass via repo-root vitest; domain build pass; web typecheck pass

## 2026-05-25 11:35 [codex] Drawing V2 drag gesture
- what: changed V2 Draw so mouse down + drag + release creates a piece; cornered drag paths build chain segments for L/Z/U-style shapes
- why: V1 Pen workflow is drag-first; V2 click-click-doubleclick felt wrong against Moraware muscle memory
- files: packages/domain/src/drawing/geometry.ts, packages/domain/src/drawing/geometry.test.ts, packages/domain/src/drawing/topology.ts, packages/domain/src/drawing/topology.test.ts, packages/domain/src/index.ts, apps/web/.../drawing-v2/tools/DrawShapeTool.tsx, apps/web/.../drawing-v2/DrawingWorkspace.tsx, docs/specs/drawing/tools/{draw-shape,edit-edge}.md
- result: geometry/topology tests 16/16 pass; domain typecheck/build pass; web typecheck pass; browser drag-create rectangle and L-shape pass with no console errors

## 2026-05-25 11:50 [codex] V1/V2 drawing comparison patch
- what: made V2 default to Draw mode and preview full drag-path chains while dragging
- why: V1 feels better because it previews the actual path continuously; V2 only applied drag-path logic after release
- files: apps/web/.../drawing-v2/state/workspace-store.ts, apps/web/.../drawing-v2/canvas/PreviewLayer.tsx, apps/web/.../drawing-v2/tools/DrawShapeTool.tsx, apps/web/.../drawing-v2/DrawingWorkspace.tsx
- result: geometry/topology tests 16/16 pass; domain build pass; web typecheck pass; browser drag-created L-shape from default Draw mode with no console errors

## 2026-05-25 12:25 [codex] V2 persistence parity
- what: V2 `?v2=1` now loads first area drawing layout, creates real counter-piece records, saves canvas layout after drag-create, and reloads persisted pieces
- why: V1 drawing was better partly because new pieces immediately round-tripped through quote drawing persistence; V2 was local-only
- files: edit/page.tsx, apps/web/.../drawing-v2/DrawingWorkspace.tsx, apps/web/.../drawing-v2/state/workspace-store.ts, apps/web/.../drawing-v2/tools/DrawShapeTool.tsx
- result: geometry/topology tests 16/16 pass; domain build pass; web typecheck pass; browser draw/save/reload preserved V2 piece with no console errors

## 2026-05-25 12:35 [codex] V2 piece controls
- what: added select/move/delete controls for V2 pieces with manual pointer hit-testing and save-on-move/delete
- why: V1 supports direct piece management; V2 needed first parity controls beyond drawing
- files: apps/web/.../drawing-v2/DrawingWorkspace.tsx, apps/web/.../drawing-v2/canvas/PieceLayer.tsx, apps/web/.../drawing-v2/state/workspace-store.ts, apps/web/.../drawing-v2/tools/{SelectPieceTool,EditDepthTool}.tsx
- result: geometry/topology tests 16/16 pass; web typecheck pass; browser select, move/save, delete/reload pass with no console errors
