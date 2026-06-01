# Pipeline Board — Design Spec

Date: 2026-06-01
Status: Approved for planning

## Context

The user wants a way to track and manage where every job sits in the countertop
fabrication workflow, eventually with a calendar view and Google Calendar sync.
That request decomposes into three independent features, each with its own
spec → plan → build cycle:

1. **Pipeline board** (this spec) — a board showing each job in its current stage.
2. Calendar view — a month/week/day view of all scheduled events. *Deferred.*
3. Google Calendar sync — OAuth + push/pull of events. *Deferred.*

This spec covers **only the pipeline board.**

### Existing building blocks

- `projects` = jobs (have `jobNumber`, `title`, `jobAddress`, `status`, `ownerUserId`).
- `projects.status` is coarse: `draft → active → completed` (one-directional).
- `phases` = named sub-jobs inside a project (not a stage machine).
- `scheduling.ScheduledEvent` carries `appointmentType`
  (`template, deposit, material, fabrication, install, invoice, repair, other`,
  plus `cut` added by migration 042) and a full status machine
  (`scheduled → confirmed → in_progress → completed → cancelled`).
- Event bus exists: `apps/api/src/events/event-bus.ts`,
  `scheduling/scheduled-event-events.ts` (events emitted post-commit).
- `apps/api/src/dashboard/dashboard.service.ts` already does cross-module
  aggregation — precedent for the board read model.
- DB migrations = numbered SQL in `db/migrations/`; next is `054`.
- Web = Next.js app router under `apps/web/src/app`.

## Decisions (locked with the user)

| Topic | Decision |
|-------|----------|
| Card unit | One card = one Project (job). |
| Column meaning | Furthest **completed** milestone (not "up next"). |
| Stages (ordered) | `new → deposit → template → material → fabrication → install → invoice → done` |
| Stage source | **Hybrid:** auto-derived from finished appointments (forward only) + manual drag override. |
| Non-stage appts | `repair`, `other`, `cut`, template-kind-only → never move a card. |
| status ↔ stage | `status` is **auto-derived from stage** (single source of truth). |
| Card density | Rich (job#, customer, title, city, next appt, assignee, days-in-stage, $ value, sq ft, open-issue count). |
| Manual drag | Both directions; backward requires an explicit confirm; drag only sets the stage flag. |
| Build approach | Stored `pipeline_stage` column + event listener (chosen over compute-on-read and full Job/JobActivity model). |

## Data model

Migration `054`, altering `projects`:

- `pipeline_stage` — enum, values `new, deposit, template, material, fabrication, install, invoice, done`. Default `new`. NOT NULL.
- `stage_entered_at` — `timestamptz`, set to `now()` on every stage change; powers "days in stage". Backfill existing rows to `created_at`.
- Existing `status` column retained but recomputed from `pipeline_stage` on every stage write. No independent status edits going forward.

`pipeline_stage` is the source of truth. `status` and `stage_entered_at` are
maintained alongside it in the same transaction.

## Domain logic

Pure functions + constants in the `domain` package (extend the `projects`
module), fully unit-tested, no I/O:

- `PIPELINE_STAGE_VALUES` — ordered `const` array; `PipelineStage` type.
- `STAGE_ORDER` — stage → index map.
- `stageFromAppointmentType(t): PipelineStage | null`
  - `deposit→deposit, template→template, material→material,
    fabrication→fabrication, install→install, invoice→invoice`.
  - `repair, other, cut`, and any unmapped type → `null` (no advance).
  - `done` has no appointment type (manual only).
- `statusFromStage(s): ProjectStatus`
  - `new → draft`; `deposit…invoice → active`; `done → completed`.
- `isForward(from, to): boolean` — `STAGE_ORDER[to] > STAGE_ORDER[from]`.

## Auto-advance flow (Slice B)

1. An appointment is finished → existing `scheduled_event.completed` fires
   (post-commit only).
2. A new listener handles it:
   - If the event's `projectId` is null → skip (only project-linked appointments
     move a card).
   - `stage = stageFromAppointmentType(event.appointmentType)`; if `null` → skip.
   - Load the project's current `pipeline_stage`. If `isForward(current, stage)`
     → update `pipeline_stage = stage`, recompute `status`, stamp
     `stage_entered_at = now()`, emit `project.stage_changed`.
   - Otherwise no-op (idempotent; never moves backward automatically).
3. The listener runs after commit, catches and logs its own errors, and **never
   throws back** into the appointment-finish transaction. Finishing an
   appointment must never fail because of a pipeline side-effect.

**Known limitation:** auto-advance only works for appointments linked to a
project (`ScheduledEvent.projectId` is nullable). Customer-only events cannot
move a card.

## Manual stage override (Slice A)

`PATCH /projects/:id/stage`

- Body: `{ stage: PipelineStage, actorUserId: string, allowBackward?: boolean }`.
- Forward move → applied directly.
- Backward move (`!isForward(current, target)` and `target !== current`)
  → rejected with `409` unless `allowBackward === true`. The web UI surfaces
  this as an "are you sure?" confirm and retries with `allowBackward: true`.
- On apply: set `pipeline_stage`, recompute `status`, stamp `stage_entered_at`,
  emit `project.stage_changed`.
- Archived project → `409` (cannot mutate).
- Drag never creates, deletes, or reschedules appointments.

## Board read model (Slice A)

`GET /pipeline` — returns job cards for the board, built dashboard-style
(joins + lateral subqueries assembled in a service).

Each card aggregates:
- Project: `id`, `jobNumber`, `title`, `jobAddress.city`, `pipeline_stage`,
  `stage_entered_at` → `daysInStage`, `ownerUserId`.
- Customer: display name.
- Next appointment: soonest scheduled event on the project with
  `scheduledAt >= now()` and status in (`scheduled`, `confirmed`) — its
  `appointmentType` + `scheduledAt`.
- Quote value + square footage: from the latest **accepted** quote, falling
  back to the latest quote if none accepted.
- Open-issue count: count of open issues on the project.

Filters: `ownerUserId`, `customerId`, `search`, `stage`. Archived projects
excluded. Response groups/sorts so the web layer can lay out columns.

## Web UI (Slice A)

- New top-level nav item **"Pipeline"** → route `/pipeline` (server component
  fetches `GET /pipeline`).
- 8 columns, horizontal scroll; rich cards; empty columns show a placeholder.
- Card click → existing `/projects/[id]`.
- Drag:
  - forward drop → PATCH stage immediately (optimistic update, then revalidate).
  - backward drop → confirm dialog → PATCH with `allowBackward: true`.
- Filter bar mirrors the existing projects list (owner, customer/search, stage).
- US units only (square feet, dollars).
- Server is the source of truth; the board revalidates after every PATCH to
  resolve stale data and drag races.

## Error handling

- Invalid `stage` value → `400`.
- Backward without `allowBackward` → `409` with a clear message.
- Stage PATCH on an archived project → `409`.
- Auto-advance listener: post-commit, self-contained error handling, never
  breaks appointment finishing.

## Testing (Definition of Done: typecheck + full suite green)

- **Domain unit:** stage ordering, `stageFromAppointmentType` (including the
  `null` cases for repair/other/cut), `statusFromStage`, `isForward`.
- **API integration:** PATCH forward / backward+confirm / backward-rejected;
  auto-advance on `scheduled_event.completed` (project-linked vs unlinked,
  idempotency, repair/other/cut no-op, backward-prevention); `GET /pipeline`
  aggregation, filters, and archived exclusion.
- **Web:** board render, drag-forward, drag-backward-confirm.
- **Golden seed:** projects spread across multiple stages.

## Slice order

- **Slice A — usable board (manual):** migration `054` + domain functions +
  `PATCH /projects/:id/stage` + `GET /pipeline` + board UI with manual drag and
  auto-derived status. Delivers a fully usable board on its own.
- **Slice B — auto-advance:** listener on `scheduled_event.completed`. Layered on
  top of Slice A.

Deferred to separate specs: calendar view, Google Calendar sync.

## Defaults chosen (open to change)

1. New projects start at `new`.
2. "Next appt" = soonest future `scheduled`/`confirmed` event on the project.
3. Card `$`/sq ft = latest accepted quote, else latest quote.
4. Any authenticated user can drag (v1; no per-stage permissions).
5. No auto-creation of the next appointment when a stage completes.
