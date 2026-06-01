# Pipeline Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Workflow note (user protocol):** All repo file edits are delegated to Codex. This plan gives Codex *short briefs* — exact paths, signatures, SQL DDL, and test intent — and trusts Codex to read the referenced files and follow established patterns. It deliberately does NOT paste full function bodies. Claude reviews between tasks.

**Goal:** Add a pipeline board that shows every job as a card in its current fab-workflow stage, with manual drag to move stages and (slice B) automatic advancement when the matching appointment is finished.

**Architecture:** Store a `pipeline_stage` (text + CHECK) on `projects` as the single source of truth; derive the coarse `status` from it. Pure stage logic lives in the `domain` package. A new `pipeline` API module serves an aggregated board read model and hosts the auto-advance event listener. The web app gets a `/pipeline` board route with native HTML5 drag.

**Tech Stack:** TypeScript, NestJS (API), `pg` (raw SQL), Zod (domain schemas), `@nestjs/event-emitter` (event bus), Next.js app router (web), Vitest (tests). US units only.

---

## Spec

Source spec: `docs/superpowers/specs/2026-06-01-pipeline-board-design.md`. Read it before starting.

Stages, ordered: `new → deposit → template → material → fabrication → install → invoice → done`.
Status derivation: `new`=draft; `deposit..invoice`=active; `done`=completed.

## Preconditions

- [ ] **Step 0a: Git** — repo is not initialized. If you want commits, run `git init` in `stoneboyz_crm/` first; otherwise skip every "Commit" step.
- [ ] **Step 0b: Test DB up** — integration tasks need Postgres: `pnpm db:test:up` then `pnpm db:migrate`. Domain unit tasks (A2, A3, A4 schema/mapper) need no DB.

## File Structure

**Create:**
- `db/migrations/054_add_pipeline_stage_to_projects.sql`
- `packages/domain/src/projects/project.pipeline.ts` — stage constants + pure logic
- `packages/domain/src/projects/project.pipeline.test.ts`
- `apps/api/src/pipeline/pipeline.service.ts` — board read model (aggregation)
- `apps/api/src/pipeline/pipeline.controller.ts` — `GET /pipeline`
- `apps/api/src/pipeline/pipeline.module.ts`
- `apps/api/src/pipeline/project-pipeline.listener.ts` — slice B auto-advance
- `apps/web/src/app/pipeline/page.tsx` — board route (server component)
- `apps/web/src/app/pipeline/PipelineBoard.tsx` — client board (drag)
- `apps/web/src/app/pipeline/stage-drop.ts` — pure drag-resolution helper (unit-tested)
- `apps/web/src/app/pipeline/stage-drop.test.ts`
- `apps/web/src/app/pipeline/_actions.ts` — server action: set stage
- `tests/integration/pipeline-stage.test.ts`
- `tests/integration/pipeline-board.test.ts`
- `tests/integration/pipeline-auto-advance.test.ts`

**Modify:**
- `packages/domain/src/projects/index.ts` — export pipeline module
- `packages/domain/src/projects/project.types.ts` — add stage fields + stage input
- `packages/domain/src/projects/project.schemas.ts` — add `updateProjectStageSchema`
- `apps/api/src/projects/project.mapper.ts` — map new columns
- `apps/api/src/projects/projects.repository.ts` — add `updateStage`
- `apps/api/src/projects/projects.service.ts` — add `setStage`
- `apps/api/src/projects/projects.controller.ts` — add `PATCH :projectId/stage`
- `apps/api/src/projects/project-events.ts` — add stage-changed payload builder
- `apps/api/src/events/event-types.ts` — add `ProjectStageChangedData` + `'project.stage_changed'`
- `apps/api/src/app.module.ts` — register `PipelineModule`
- `apps/web/src/components/app-shell.tsx` — add "Pipeline" nav link

---

# SLICE A — Usable board (manual drag)

### Task A1: Migration — add stage columns to projects

**Files:**
- Create: `db/migrations/054_add_pipeline_stage_to_projects.sql`

- [ ] **Step 1: Write the migration**

Follow the style of `db/migrations/034_update_appointment_type_enum.sql` (top `-- Rollback:` comment, `ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)`). The migration must:
- Add `pipeline_stage text NOT NULL DEFAULT 'new'`.
- Add CHECK `pipeline_stage IN ('new','deposit','template','material','fabrication','install','invoice','done')`.
- Add `stage_entered_at timestamptz NOT NULL DEFAULT now()`.
- Backfill existing rows: `stage_entered_at = created_at`; set `pipeline_stage = 'done'` where `status = 'completed'` (all others stay `'new'`).
- Add index `projects_pipeline_stage_idx` on `pipeline_stage`.

- [ ] **Step 2: Apply + verify**

Run: `pnpm db:test:up && pnpm db:migrate`
Expected: migrate completes with no error; `\d projects` shows `pipeline_stage`, `stage_entered_at`, the CHECK, and the index.

- [ ] **Step 3: Commit** — `feat(db): add pipeline_stage and stage_entered_at to projects`

---

### Task A2: Domain — stage constants + order

**Files:**
- Create: `packages/domain/src/projects/project.pipeline.ts`
- Test: `packages/domain/src/projects/project.pipeline.test.ts`
- Modify: `packages/domain/src/projects/index.ts`

- [ ] **Step 1: Write failing test** — assert `PIPELINE_STAGE_VALUES` equals the ordered 8-stage array exactly, and `STAGE_ORDER` maps each stage to its index (`new`→0 … `done`→7).

- [ ] **Step 2: Run, verify fail** — `pnpm test project.pipeline` → FAIL (module not found).

- [ ] **Step 3: Implement** — in `project.pipeline.ts` export `PIPELINE_STAGE_VALUES` (`as const`, ordered), `PipelineStage` type, and `STAGE_ORDER` (stage→index record). Add `export * from './project.pipeline.js';` to `index.ts`.

- [ ] **Step 4: Run, verify pass** — `pnpm test project.pipeline` → PASS.

- [ ] **Step 5: Commit** — `feat(domain): add pipeline stage constants`

---

### Task A3: Domain — pure stage functions

**Files:**
- Modify: `packages/domain/src/projects/project.pipeline.ts`
- Modify: `packages/domain/src/projects/project.pipeline.test.ts`

- [ ] **Step 1: Write failing tests** for three functions:
  - `stageFromAppointmentType(t)` → `deposit→'deposit'`, `template→'template'`, `material→'material'`, `fabrication→'fabrication'`, `install→'install'`, `invoice→'invoice'`; and `'repair'`, `'other'`, `'cut'` → `null`. Include one case per mapped type and one per null type.
  - `statusFromStage(s)` → `'new'→'draft'`; `'deposit'|'template'|'material'|'fabrication'|'install'|'invoice'→'active'`; `'done'→'completed'`.
  - `isForward(from,to)` → true when `STAGE_ORDER[to] > STAGE_ORDER[from]`, false otherwise (test forward, backward, equal).

- [ ] **Step 2: Run, verify fail** — FAIL (functions not defined).

- [ ] **Step 3: Implement** the three functions in `project.pipeline.ts`. `stageFromAppointmentType` returns `PipelineStage | null` and takes `AppointmentType` (import the type). `statusFromStage` returns `ProjectStatus`.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit** — `feat(domain): add pipeline stage mapping functions`

---

### Task A4: Domain types + schema + API mapper

**Files:**
- Modify: `packages/domain/src/projects/project.types.ts`
- Modify: `packages/domain/src/projects/project.schemas.ts`
- Modify: `apps/api/src/projects/project.mapper.ts`
- Test: `apps/api/src/projects/project.mapper.test.ts` (create if absent; mirror `customer.mapper.test.ts`)

- [ ] **Step 1: Write failing mapper test** — a `ProjectRow` with `pipeline_stage: 'template'` and `stage_entered_at: <Date>` maps to `pipelineStage: 'template'` and `stageEnteredAt: <iso string>`.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**
  - `project.types.ts`: add `pipelineStage: PipelineStage;` and `stageEnteredAt: string;` to `Project`. Add interface `UpdateProjectStageInput { actorUserId: string; stage: PipelineStage; allowBackward?: boolean | undefined; }`.
  - `project.schemas.ts`: add `export const updateProjectStageSchema = z.object({ stage: z.enum(PIPELINE_STAGE_VALUES), allowBackward: z.boolean().optional() });` (import `PIPELINE_STAGE_VALUES`).
  - `project.mapper.ts`: extend `ProjectRow` with `pipeline_stage: string; stage_entered_at: Date;` and map both fields (ISO string for the timestamp).

- [ ] **Step 4: Run, verify pass** — `pnpm test project.mapper` and `pnpm typecheck`.

- [ ] **Step 5: Commit** — `feat(domain): add pipeline stage to project type, schema, mapper`

---

### Task A5: Event type + payload builder for stage change

**Files:**
- Modify: `apps/api/src/events/event-types.ts`
- Modify: `apps/api/src/projects/project-events.ts`

- [ ] **Step 1: Implement** (no separate unit test; covered by integration in A7)
  - `event-types.ts`: add interface `ProjectStageChangedData { projectId: string; actorUserId: string; fromStage: string; toStage: string; source: 'manual' | 'auto'; }` and add `'project.stage_changed'` to the `ProjectEventName` union.
  - `project-events.ts`: add `buildProjectStageChangedPayload(projectId, actorUserId, fromStage, toStage, source)` returning `ProjectStageChangedData`.

- [ ] **Step 2: Verify** — `pnpm typecheck` passes.

- [ ] **Step 3: Commit** — `feat(events): add project.stage_changed event`

---

### Task A6: Repository — updateStage

**Files:**
- Modify: `apps/api/src/projects/projects.repository.ts`

- [ ] **Step 1: Implement** `updateStage(projectId: string, params: { stage: PipelineStage; status: ProjectStatus }): Promise<Project | null>`. Single `UPDATE projects SET pipeline_stage = $1, status = $2, stage_entered_at = now(), updated_at = now() WHERE id = $3 AND archived_at IS NULL RETURNING *`, mapped via `mapProjectRow`. (Covered by integration tests in A7.)

- [ ] **Step 2: Verify** — `pnpm typecheck`.

- [ ] **Step 3: Commit** — `feat(api): add projects.updateStage repository method`

---

### Task A7: Service + controller — manual stage change

**Files:**
- Modify: `apps/api/src/projects/projects.service.ts`
- Modify: `apps/api/src/projects/projects.controller.ts`
- Test: `tests/integration/pipeline-stage.test.ts`

- [ ] **Step 1: Write failing integration tests** (follow existing `tests/integration` harness — read a sibling test for setup/teardown + auth header conventions). Cases:
  1. Forward move (`new`→`deposit`) → 200, response `pipelineStage='deposit'`, `status='active'`.
  2. Backward without `allowBackward` (`deposit`→`new`) → 409, code `BACKWARD_STAGE_NOT_ALLOWED`.
  3. Backward with `allowBackward:true` → 200, `pipelineStage='new'`, `status='draft'`.
  4. Same stage (no-op) → 200, unchanged.
  5. `done` → `status='completed'`.
  6. Archived project → 409.
  7. Invalid stage value → 400.
  8. Unknown project id → 404.

- [ ] **Step 2: Run, verify fail** — `pnpm test:integration pipeline-stage` → FAIL (route 404).

- [ ] **Step 3: Implement**
  - `projects.service.ts`: add `setStage(projectId, input: UpdateProjectStageInput, source: 'manual' | 'auto' = 'manual')`. Load via `findById` (→404 if null). If `input.stage === current.pipelineStage` return current (no-op, no event). Compute `forward = isForward(current.pipelineStage, input.stage)`; if `!forward` and `source === 'manual'` and `!input.allowBackward` → `throw new ConflictException({ code: 'BACKWARD_STAGE_NOT_ALLOWED', message: ... })`. Compute `status = statusFromStage(input.stage)`. Call `repo.updateStage`. Emit `project.stage_changed` via builder with `source`. Return project.
  - `projects.controller.ts`: add `@Patch(':projectId/stage')` — validate id (`projectIdSchema`) and body (`updateProjectStageSchema`), call `setStage`. Import `ConflictException` mapping is automatic via Nest.

- [ ] **Step 4: Run, verify pass** — `pnpm test:integration pipeline-stage` → PASS. Run `pnpm typecheck`.

- [ ] **Step 5: Commit** — `feat(api): add PATCH /projects/:id/stage`

---

### Task A8: Board read model — pipeline module

**Files:**
- Create: `apps/api/src/pipeline/pipeline.service.ts`
- Create: `apps/api/src/pipeline/pipeline.controller.ts`
- Create: `apps/api/src/pipeline/pipeline.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `tests/integration/pipeline-board.test.ts`

- [ ] **Step 1: Write failing integration tests** for `GET /pipeline`:
  1. Returns a card per non-archived project with: `id`, `jobNumber`, `title`, `city`, `pipelineStage`, `daysInStage` (integer ≥ 0), `ownerUserId`, `customerName`, `nextAppointment` (`{ appointmentType, scheduledAt }` or `null`), `quoteValueCents`, `squareFeet`, `openIssueCount`.
  2. `nextAppointment` = soonest future event with status in (`scheduled`,`confirmed`); past/cancelled excluded; `null` when none.
  3. Quote value/sqft from latest accepted quote, else latest quote, else 0/0.
  4. Archived projects excluded.
  5. Filters: `?stage=`, `?ownerUserId=`, `?customerId=`, `?search=` each narrow results.

- [ ] **Step 2: Run, verify fail** — route 404.

- [ ] **Step 3: Implement** (read `apps/api/src/dashboard/dashboard.service.ts` for the raw-SQL aggregation style and `DATABASE_POOL` injection)
  - `pipeline.service.ts`: `getBoard(filters)` runs one SQL over `projects p` (where `archived_at IS NULL`) joined to `customers c`, with `LEFT JOIN LATERAL` for next appointment (`scheduled_events` future + status filter, `ORDER BY scheduled_at ASC LIMIT 1`), `LEFT JOIN LATERAL` for quote value+sqft (latest accepted then latest), and a correlated `COUNT` for open issues. Compute `daysInStage` as `EXTRACT(DAY FROM now() - stage_entered_at)::int`. Apply optional filters. Return mapped card DTOs (camelCase).
  - `pipeline.controller.ts`: `@Controller('pipeline')`, `@Get()` parses query with a Zod schema (`stage` optional enum, `ownerUserId`/`customerId`/`search` optional strings), returns `getBoard`.
  - `pipeline.module.ts`: provides service + controller; imports `DatabaseModule`. Register in `app.module.ts`.

- [ ] **Step 4: Run, verify pass** — `pnpm test:integration pipeline-board`; `pnpm typecheck`.

- [ ] **Step 5: Commit** — `feat(api): add GET /pipeline board read model`

---

### Task A9: Web — board route, drag, nav

**Files:**
- Create: `apps/web/src/app/pipeline/stage-drop.ts`
- Create: `apps/web/src/app/pipeline/stage-drop.test.ts`
- Create: `apps/web/src/app/pipeline/page.tsx`
- Create: `apps/web/src/app/pipeline/PipelineBoard.tsx`
- Create: `apps/web/src/app/pipeline/_actions.ts`
- Modify: `apps/web/src/components/app-shell.tsx`

- [ ] **Step 1: Write failing test** for the pure helper `resolveStageDrop(fromStage, toStage)` → `{ kind: 'noop' }` when equal, `{ kind: 'forward' }` when `isForward`, `{ kind: 'backward' }` otherwise (reuse `isForward`/`STAGE_ORDER` from `@stoneboyz/domain`).

- [ ] **Step 2: Run, verify fail** — `pnpm -C apps/web test stage-drop` (or root `pnpm test`).

- [ ] **Step 3: Implement helper** `stage-drop.ts`.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Implement UI** (no new deps — use native HTML5 drag: `draggable`, `onDragStart`, `onDragOver`, `onDrop`; read `apps/web/src/app/projects/page.tsx` + a `_actions.ts` for the fetch/server-action + `lib/api.ts` client conventions)
  - `page.tsx`: server component, fetch `GET /pipeline`, render 8 columns. Rich card: jobNumber · customerName, title, city, next appt (type + date), ownerUserId, daysInStage, `$` (cents→dollars) and sq ft, open-issue badge. Card links to `/projects/[id]`. US units.
  - `PipelineBoard.tsx`: client component owning drag. On drop call `resolveStageDrop`; `noop`→nothing; `forward`→server action immediately; `backward`→`window.confirm` then server action with `allowBackward:true`. Revalidate after success.
  - `_actions.ts`: server action `setProjectStage(projectId, stage, allowBackward?)` → `PATCH /projects/:id/stage`; surfaces 409 so the client can message it.
  - `app-shell.tsx`: add a "Pipeline" nav item → `/pipeline`.

- [ ] **Step 6: Verify** — `pnpm typecheck:web`; manually load `/pipeline` (run `pnpm dev`), confirm columns render and a forward drag persists after refresh; a backward drag prompts confirm.

- [ ] **Step 7: Commit** — `feat(web): add pipeline board route with drag`

---

### Slice A checkpoint

- [ ] Run full suite: `pnpm typecheck && pnpm typecheck:web && pnpm test && pnpm test:integration`. Report green/red with counts. Board is fully usable with manual drag before starting Slice B.

---

# SLICE B — Auto-advance on appointment completion

### Task B1: Auto-advance listener

**Files:**
- Create: `apps/api/src/pipeline/project-pipeline.listener.ts`
- Modify: `apps/api/src/pipeline/pipeline.module.ts` (provide listener; import `ProjectsModule` + scheduling access)
- Verify: `apps/api/src/events/events.module.ts` wires `EventEmitterModule.forRoot()` (listeners need it). If not global, fix.
- Test: `tests/integration/pipeline-auto-advance.test.ts`

- [ ] **Step 1: Write failing integration tests** — create a project + a project-linked appointment, then finish it (`POST /customers/:cid/events/:eid/finish`) and assert the project advanced:
  1. Finish a `template` appointment linked to a `new`-stage project → project `pipelineStage='template'`, `status='active'`.
  2. Finish an appointment with `projectId = null` → no project changes.
  3. Finish a `repair`/`other` appointment → no stage change.
  4. Idempotent: finishing an appointment whose stage is not forward of current (e.g. project already at `install`, finish `deposit`) → no change.
  5. Listener failure path: a finish still returns 200 even if the project lookup would fail (listener must swallow errors). Assert the finish HTTP call succeeds.

- [ ] **Step 2: Run, verify fail** — stages don't move yet.

- [ ] **Step 3: Implement listener**
  - `@Injectable()` class with `@OnEvent('scheduled_event.completed')` method receiving the `EventEnvelope<ScheduledEventEventData>`.
  - Load the scheduled event by `data.scheduledEventId` (+ `data.customerId`) to read `projectId` and `appointmentType` (use `ScheduledEventsService.getById` or the scheduling repository — read the scheduling module to pick the available read path).
  - If `projectId == null` → return. `stage = stageFromAppointmentType(appointmentType)`; if `null` → return.
  - Load project; if `isForward(project.pipelineStage, stage)` → `projectsService.setStage(projectId, { actorUserId: data.actorUserId, stage }, 'auto')`. Else return.
  - Wrap the whole body in `try/catch`; on error `Logger.error(...)` and return. **Never rethrow** (must not break appointment finishing).
  - Register the listener as a provider in `pipeline.module.ts`; import the modules needed for `ProjectsService` + scheduling read.

- [ ] **Step 4: Run, verify pass** — `pnpm test:integration pipeline-auto-advance`; `pnpm typecheck`.

- [ ] **Step 5: Commit** — `feat(api): auto-advance pipeline stage on appointment completion`

---

### Final checkpoint

- [ ] **Definition of Done:** `pnpm typecheck && pnpm typecheck:web && pnpm test && pnpm test:integration` all green. Report counts (e.g. "NNN/NNN passing").

---

## Self-Review (completed during planning)

- **Spec coverage:** stages+order (A2), stageFromAppointmentType incl. null cases (A3), statusFromStage (A3), stored stage + stage_entered_at + backfill (A1), status auto-derived (A6/A7), manual drag both-ways + backward confirm (A7/A9), rich card aggregation (A8), board route + nav + US units (A9), auto-advance forward-only + linked-only + idempotent + non-throwing (B1). All mapped.
- **Placeholder scan:** none — every task names exact files, signatures, and test cases.
- **Type consistency:** `pipelineStage`/`stageEnteredAt` (camel) ↔ `pipeline_stage`/`stage_entered_at` (snake) used consistently; `setStage(projectId, UpdateProjectStageInput, source)` signature identical in A7 and B1; `resolveStageDrop` kinds (`noop`/`forward`/`backward`) consistent A9.
- **Known limitation carried from spec:** auto-advance only fires for appointments with a non-null `projectId`.
