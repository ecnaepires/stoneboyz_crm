## Agent Handoff

### Goal
Pick up the previous handoff and execute the remaining slices of
`docs/superpowers/plans/2026-06-09-core-scheduling-loop.md` (Tasks 3-6:
assignee resources, web assignee swap, autoschedule engine, calendar →
activity editor). Tasks 1-2 were already committed by the prior session.

### What changed
Three commits this session (all gates green before each):

1. **`64cdd4c` — job activities scheduling backbone with assignee resources.**
   Mostly committed pre-existing working-tree work after validating it:
   migrations 062/063 (job templates on projects, `job_activities`) and 064
   (`assignees` + `scheduled_event_assignees`, seed person-assignee per user,
   DROP `scheduled_events.assignee_user_ids` with NO backfill — ADR 0008),
   domain + API modules, and the activity editor page. New this session: the
   complete web swap `assigneeUserIds` → `assigneeIds` (Task 4) — shared
   `AssigneeSelect` component with multi-line "+ Add Assignee" quick-create
   (`apps/web/src/components/assignee-select.tsx` +
   `apps/web/src/app/_actions/assignees.ts`), wired into the schedule
   calendar, event new/detail pages, job detail, and the activity editor.
   The old "blank = assign yourself" fallback is gone: blank now means zero
   assignees (user IDs are no longer valid assignee IDs).
2. **`3413b0f` — autoschedule engine (Task 5).** Scheduling a job's first
   activity chains every later `not_scheduled` activity at its business-day
   offset (Mon-Fri, default 1) after the previous link, 08:00 UTC placeholder
   times, `autoschedule_state='autoscheduled'` (anchor stays null). Manual
   reschedule flips that activity to `manual_override` (never auto-moved
   again) and re-chains downstream autoscheduled followers; chain math passes
   through overridden/completed/in-progress slots without touching them. Pure
   helpers in `packages/domain/src/scheduling/business-days.ts` (TDD'd).
   Auto/Edited badges on the activities table and editor.
3. **`a06fff8` — calendar → activity editor (Task 6).** `ScheduledEvent`
   responses gain `jobActivityId`; calendar month/agenda clicks open
   `/projects/[id]/activities/[activityId]` when linked, standalone events
   keep the event detail page.

### Files touched
See the three commits for full lists. Key new files:
- `db/migrations/064_create_assignees.sql` — assignees + join, seed, column drop.
- `docs/adr/0008-assignees-no-backfill.md` — no-backfill decision record.
- `apps/api/src/assignees/`, `packages/domain/src/assignees/` — assignee module.
- `apps/web/src/components/assignee-select.tsx` — shared picker + quick-create.
- `packages/domain/src/scheduling/business-days.ts` (+ test) — chain math.
- `apps/api/src/job-activities/job-activities.service.ts` — `autoscheduleFollowers` / `rechainFollowers`.
- `tests/integration/assignees.test.ts`, `tests/integration/autoschedule.test.ts`.

### Business logic affected
- Scheduling: assignees are resources (person/team/truck/...), not users;
  events may have zero assignees; historical event→user assignment data was
  intentionally destroyed (no backfill, user-approved 2026-06-09). Scheduling
  an anchor activity now auto-creates events for ALL later activities of the
  job (e.g. Standard Job = 8 activities → 8 events from one click).
- Job lifecycle: `job_activities.autoschedule_state` is now a real state
  machine (`autoscheduled` ↔ `manual_override`); manual edits win forever.
- Quotes/pricing, Measurements, Accounting/invoicing, Customer communication,
  Deployment/ops: unchanged.

### Assumptions made
- The uncommitted Task-3 backend found in the tree was finished work; I
  validated it via the full suite instead of rewriting it (one leftover raw
  SQL in `pipeline-board.test.ts` still inserted the dropped column — fixed).
- 08:00 UTC placeholder times (not shop-local) are acceptable v1 per the plan.
- `autoscheduleOffsetUnit` is ignored v1; offsets are business days.
- Leaving migration 061/roles/`inventory_manager` work uncommitted is fine —
  it is a separate slice (orders/reports/slabs role guards + admin UI).

### Validation performed
- Per slice and at the end: `pnpm typecheck`, `pnpm -C apps/api typecheck`,
  `pnpm -C apps/web typecheck`, `pnpm -C packages/api-client typecheck`,
  `pnpm spec:check` — all clean.
- `pnpm test`: 545 passed / 52 files (13 new tests: business-days unit,
  autoschedule chaining/weekend-skip/manual-override/completed-immunity,
  linked-vs-standalone `jobActivityId`).
- `pnpm db:migrate` idempotent (0 applied on re-run); `pnpm db:test:reset` ok.
- NOT done: manual browser walkthrough of the full loop (create job →
  schedule anchor → followers on calendar → calendar click → editor). All
  behavior is integration-tested, but eyes on the real UI are still owed.

### Risks / follow-up
- **Browser verification owed** (plan Task 7 final bullet): run `pnpm dev`,
  use `dev-smoke-session-token` cookie, walk the loop above; check the
  AssigneeSelect quick-create refresh UX in particular.
- Scheduling an anchor creates events for every follower — if a shop never
  wants some activities (e.g. Repair), they must cancel them; consider a
  template flag later.
- `rechainFollowers` issues one event UPDATE per follower (no transaction
  across the chain); a crash mid-chain leaves a partially re-chained job.
  Low stakes (placeholder times), but a known gap.
- Dirty tree still holds ~70 files of OLDER uncommitted slices: inventory
  manager role (migration 061 + role guards + admin users UI), price-list /
  slab / drawing / quote changes, doc/skill edits. Same drill: stage by
  coherent slice. Test-robustness tweaks in `dashboard.test.ts`,
  `customer-addresses.test.ts`, `price-lists.test.ts` are also uncommitted.
- Desired-workflow phases still open: calendar drag/drop (Phase 7),
  forms/files (Phase 8) — both deliberately out of scope.
- Next step: browser-verify the loop, then commit the inventory-manager
  slice, then pick the next phase from `docs/current_dashboard_notes.md`.
