# Moraware-Style Calendar & Job Views — Full Implementation Plan

## Context

Calendar alignment exists (custom week view at `apps/web/src/app/schedule/`), but functionality lags Moraware Systemize, which the shop wants to match closely. Moraware's calendar model: **saved views** (Shared = all users, My = private, per-user default), a **Customize panel** (display type, filters by activity type/assignee/status, display-field picker for activity boxes, Color Activities By, auto-refresh), **drag-and-drop** that updates the underlying job record (incl. assignee changes), **capacity totals** (daily hours + sq ft), batch update, print, map, availability blocks, and a parallel **Jobs list view** with sortable/customizable columns sharing the same saved-view system.

This plan delivers all of it in 7 independently-shippable phases. It is written for execution by a less capable model: exact files, DDL sketches, endpoint signatures, decisions pre-made.

Sources: repo's own `docs/moraware-live-gap-analysis-2026-05-16.md` ("Calendar And Dispatch" section), Moraware help docs (Intro to Calendar Views, Calendar Quick Reference, Use Filters), user's video walkthrough notes.

**Critical existing flaw fixed in Phase 1:** `apps/web/src/app/schedule/page.tsx:159-173` fetches events with one API call **per customer** (loop over ≤100 customers). A shop-wide `GET /events` endpoint replaces this.

**Critical behavior gap fixed in Phase 4:** dragging a calendar event PATCHes the event directly (`moveScheduleEventToDateAction` in `apps/web/src/app/schedule/_actions.ts`), bypassing `JobActivitiesService.reschedule()` → `rechainFollowers()` — so autoscheduled follower activities never move. Drag must route through the reschedule endpoint with a confirm dialog.

## Conventions (every phase)

1. **Spec first**: edit `docs/specs/api/openapi.yaml` BEFORE API code; regenerate client: `pnpm --filter @stoneboyz/api-client generate`; commit regenerated `packages/api-client/src/schema.ts`. NEVER hand-edit `packages/api-client`.
2. **Migrations**: `db/migrations/`, append-only, never edit existing. Next number: 065.
3. **Domain**: pure types + zod in `packages/domain/src/`, export via `packages/domain/src/index.ts`, zero framework imports.
4. **Controllers**: follow `apps/api/src/scheduling/scheduled-events.controller.ts` pattern — zod `safeParse`, `badRequest(formatZodError(...))`, `@CurrentUser()`.
5. **Gates**: `pnpm test`, `pnpm typecheck`, browser verify (run `pnpm dev` from root; web MUST be port 3000 for Better Auth).
6. **Tests**: `tests/integration/*.test.ts`; templates: `autoschedule.test.ts`, `scheduled-events.test.ts`, `assignees.test.ts`, helpers in `tests/integration/helpers/`.

## Pre-made decisions

| Decision | Choice | Why |
|---|---|---|
| Calendar library | Keep custom (no FullCalendar) | Moraware look is bespoke boxes; drag already works |
| Global events pagination | None; require ≤62-day range + `LIMIT 2000` | Small shop; cursor adds complexity for nothing |
| View config storage | JSONB validated by zod in domain; `version: 1` field | Schema evolution escape hatch |
| Shared view permissions | Anyone creates shared/private; edit own; admin edits any shared | Small shop, no new roles |
| Availability blocks | New `availability_blocks` table, NOT an appointment type | `scheduled_events.customer_id` is NOT NULL (migration 006); blocks aren't customer work |
| Calendar settings | `app_settings` key-value JSONB table, one `calendar` key | Cheapest extensible option |
| Batch update | Sequential server-action loop, no batch endpoint | Non-atomic OK for small shop; document in JSDoc |
| Activity-linked drag | Route through existing `rescheduleJobActivity` endpoint + follower-preview confirm dialog | Fixes rechain gap |
| Job list data | New read-model endpoint `GET /projects/job-list` | Don't widen `Project` schema |
| Per-user default view | `user_view_defaults` junction table | Defaults can point at shared views |
| Sq-ft source | Extract `PROJECT_MATERIAL_SQFT` CTE from `apps/api/src/reports/reports.service.ts` into shared constant | Already-proven single source of truth (quotes → quote_areas → generated_price_lines where category='material') |
| URL vs view config | URL params override view config (URL wins) | Shareable links keep working |

---

## Phase 1 — Global `GET /events` endpoint (kill the N+1)

No migration.

**Domain** (`packages/domain/src/scheduling/scheduled-event.types.ts` + `scheduled-event.schemas.ts`):

```ts
export interface CalendarEventItem extends ScheduledEvent {
  customerName: string;
  projectTitle: string | null;
  jobNumber: string | null;
  notes: string | null;   // check scheduled-event.mapper.ts; add if absent from payload
}

export const listCalendarEventsSchema = z.object({
  from: z.string().date(),                 // required
  to: z.string().date(),                   // required, EXCLUSIVE upper bound
  eventTypes: z.array(scheduledEventTypeSchema).optional(),
  appointmentTypes: z.array(appointmentTypeSchema).optional(),
  statuses: z.array(scheduledEventStatusSchema).optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  customerId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  hideCompleted: z.coerce.boolean().optional(),
}).refine(/* to > from AND range <= 62 days */);
```

**OpenAPI**: new path `/events` GET, operationId `listCalendarEvents`, array params `style: form, explode: true`, response `{ data: CalendarEventItem[] }` (new schema = allOf ScheduledEvent + the extra fields). Regen client.

**API** (extend `apps/api/src/scheduling/`):
- New `calendar-events.controller.ts` — `@Controller('events')`, single `@Get()`. Normalize single-value query params to arrays before zod parse (Nest yields string for one value).
- `scheduled-events.repository.ts` → add `listGlobal(input)`:

```sql
SELECT se.*, c.name AS customer_name, p.title AS project_title, p.job_number,
       COALESCE(array_agg(sea.assignee_id) FILTER (WHERE sea.assignee_id IS NOT NULL), '{}') AS assignee_ids
FROM scheduled_events se
JOIN customers c ON c.id = se.customer_id
LEFT JOIN projects p ON p.id = se.project_id
LEFT JOIN scheduled_event_assignees sea ON sea.scheduled_event_id = se.id
WHERE se.deleted_at IS NULL
  AND se.scheduled_at >= $1 AND se.scheduled_at < $2
  AND (dynamic: event_type = ANY / appointment_type = ANY / status = ANY /
       customer_id = / project_id = / status <> 'completed' when hideCompleted)
GROUP BY se.id, c.name, p.title, p.job_number
HAVING ($N::uuid[] IS NULL OR array_agg(sea.assignee_id) && $N)   -- assigneeIds
ORDER BY se.scheduled_at ASC, se.id ASC
LIMIT 2000
```

Reuse the assignee-aggregation join shape from existing `scheduled-event.mapper.ts`. Thin service passthrough; register controller in scheduling module.

**Web**: rewrite `apps/web/src/app/schedule/page.tsx` — one `client.GET("/events", ...)` replaces the per-customer loop. Keep `/customers`, `/projects`, `/assignees` fetches for dropdowns only. `normalizeEvent` becomes near-passthrough. Zero visual change.

**Tests**: `tests/integration/calendar-events.test.ts` — two customers' events in one response; each filter; from/to boundary (to exclusive); 400 on missing from/to or >62-day range.

**Verify**: identical week render; network tab shows ONE `/events` call; existing URL filters still work.

---

## Phase 2 — Saved Views: table, CRUD API, view selector

**Migration `db/migrations/065_create_calendar_views.sql`**:

```sql
CREATE TABLE IF NOT EXISTS calendar_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  view_kind text NOT NULL DEFAULT 'calendar',
  owner_user_id text REFERENCES "user"(id) ON DELETE CASCADE,  -- NULL = system-seeded shared view
  is_shared boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT calendar_views_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT calendar_views_kind_check CHECK (view_kind IN ('calendar','job_list')),
  CONSTRAINT calendar_views_system_views_shared CHECK (owner_user_id IS NOT NULL OR is_shared)
);
CREATE INDEX IF NOT EXISTS calendar_views_owner_idx ON calendar_views (owner_user_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS user_view_defaults (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  view_kind text NOT NULL CHECK (view_kind IN ('calendar','job_list')),
  calendar_view_id uuid NOT NULL REFERENCES calendar_views(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, view_kind)
);

CREATE INDEX IF NOT EXISTS scheduled_events_scheduled_at_idx
  ON scheduled_events (scheduled_at) WHERE deleted_at IS NULL;   -- supports Phase 1 query

-- Seed shared starter views (owner NULL, is_shared true):
-- 'All Activities' (no filters), 'Template', 'Fabrication', 'Install'
-- each config: {"version":1,"displayType":"week",...,"filters":{"appointmentTypes":["template"]}} etc.
```

**Domain** — new `packages/domain/src/scheduling/calendar-view.types.ts` + `calendar-view.schemas.ts`:

```ts
export const CALENDAR_DISPLAY_FIELD_VALUES = ['projectTitle','customerName','address',
  'activityTitle','time','duration','status','assignees','notes','sqft'] as const;

export const calendarViewConfigSchema = z.object({
  version: z.literal(1),
  displayType: z.enum(['day','week','range']).default('week'),
  rangeDays: z.number().int().min(2).max(31).optional(),
  groupBy: z.enum(['none','assignee']).default('none'),
  filters: z.object({
    eventTypes: z.array(scheduledEventTypeSchema).default([]),
    appointmentTypes: z.array(appointmentTypeSchema).default([]),
    statuses: z.array(scheduledEventStatusSchema).default([]),
    assigneeIds: z.array(z.string().uuid()).default([]),
    customerId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    hideCompleted: z.boolean().default(false),
  }).default({}),
  displayFields: z.array(z.enum(CALENDAR_DISPLAY_FIELD_VALUES))
    .default(['projectTitle','customerName','address','activityTitle','time','status','assignees']),
  colorBy: z.enum(['appointmentType','status','assignee']).default('appointmentType'),
  wrapText: z.boolean().default(true),
  autoRefreshSeconds: z.number().int().min(15).max(600).nullable().default(null),
});
// + jobListViewConfigSchema (version, columns, sortBy, sortDirection) — column enum tightened Phase 7
// + calendarViewSchema (row + computed isDefault), createCalendarViewSchema, updateCalendarViewSchema
```

On read, `safeParse` config; fall back to defaults if stale config fails.

**OpenAPI**: `/calendar-views` GET (visible = shared + own; `viewKind` query; rows carry computed `isDefault`) + POST; `/calendar-views/{viewId}` GET/PATCH/DELETE (soft archive); `/calendar-views/{viewId}/make-default` POST. Permissions in service: edit/delete if `ownerUserId === actorUserId` OR (actor admin AND view shared); else 403. Check `apps/api/src/auth/` for how role attaches to request.

**API**: new module `apps/api/src/calendar-views/` — module/controller/service/repository/mapper. Register in `app.module.ts`.

**Web**:
- New `apps/web/src/app/schedule/ViewSelector.tsx` (client): dropdown grouped My Views / Shared Views; Save View / Save As… / Set default / Delete. Selected view id in URL `?view=<id>`; explicit URL filter params override view config.
- `page.tsx`: load views + user default; effective config = view config ⊕ URL overrides; pass to `ScheduleCalendar`.
- New `apps/web/src/app/schedule/_view-actions.ts`: `createViewAction`, `updateViewAction`, `deleteViewAction`, `setDefaultViewAction`.
- Add `apps/web/src/components/ui/dialog.tsx` primitive (shadcn style) for Save As naming.

**Docs**: append glossary entries to `CONTEXT.md` (terms only, no implementation detail): **Calendar View** (a saved, named calendar configuration: display type, filters, display fields, coloring), **My View** (Calendar View private to its owner), **Shared View** (Calendar View visible to every user), **Color Activities By** (the field whose value decides each activity box's color), **Display Field** (one piece of job/activity info shown inside an activity box).

**Tests**: `tests/integration/calendar-views.test.ts` — CRUD; non-owner can't edit private view; admin edits shared; per-user default; seeded views present; bad config → 400.

**Verify**: pick seeded "Install" view → only installs; save a My View; set default; reload lands on it.

---

## Phase 3 — Customize panel + config-driven rendering

No migration, no API change.

**Web only**:
- New `apps/web/src/app/schedule/CustomizePanel.tsx` (client slide-over): draft `CalendarViewConfig` controls — display type (Day/Week/N-day + count), filter multiselects (add generic `apps/web/src/components/ui/multi-select.tsx`, modeled on `assignee-select.tsx`), customer/project selects, hide-completed, display-field picker with up/down reorder buttons (no dnd lib), Color By radio, wrap-text, auto-refresh (Off/30s/60s/5m). "Apply" → individual URL params (extend `buildScheduleHref` in `apps/web/src/lib/schedule-links.ts`). "Save to view" → Phase 2 update action.
- Refactor `ScheduleCalendar.tsx` (503 lines → config-driven). **Do it in this order to de-risk**: first extract `EventCard.tsx` + `colorForEvent()` + layout components keeping week view pixel-identical under default config; then add day/range modes.
  - `EventCard.tsx`: renders only `config.displayFields` in order. `sqft` renders blank until Phase 5.
  - `colorForEvent(event, colorBy)`: appointmentType → existing `TASK_COLOR_PALETTE`; status → new `STATUS_COLOR_PALETTE`; assignee → deterministic hash of first assignee id over 10-color palette (unassigned gray).
  - Wrap text: `truncate` vs `whitespace-normal`.
  - Auto-refresh: `useEffect` + `setInterval(router.refresh, autoRefreshSeconds * 1000)`.

**Tests**: domain unit test for config schema defaults (`packages/domain/src/scheduling/calendar-view.schemas.test.ts`); suite stays green.

**Verify**: 14-day range; reorder display fields; color by status; auto-refresh picks up change made in second tab.

---

## Phase 4 — Interactions: assignee lanes, rechain-aware drag, quick create, event popup

No migration. No new endpoints — reuse `POST /customers/{cid}/projects/{pid}/activities/{aid}/reschedule` (verify operationId `rescheduleJobActivity` near `docs/specs/api/openapi.yaml:4497`), event `finish`/`confirm`, `GET .../activities`.

**Web**:
1. **Assignee lanes** (`groupBy:'assignee'`): row per active assignee + "Unassigned", columns = days; event appears in every assigned lane. Drop target = (assigneeId, dateKey); drop swaps source-lane assignee for target-lane assignee in `assigneeIds` via PATCH.
2. **Rechain-aware move** — replace `moveScheduleEventToDateAction` flow in `_actions.ts`:
   - `prepareEventMoveAction(...)`: if `jobActivityId` null → `{mode:'direct'}`. Else fetch activities; followers = `sortOrder > activity.sortOrder && autoscheduleState==='autoscheduled' && status in ('scheduled','confirmed')`; return `{mode:'activity', followers:[{id,title,currentScheduledAt}]}`.
   - Client: followers non-empty → confirm dialog ("Moving Template also moves: Cut (Thu), Fabrication (Fri)…"); on confirm call `confirmEventMoveAction` → reschedule endpoint (preserve time-of-day) when `mode==='activity'`, else PATCH.
   - Extract follower filter to pure helper `movableFollowers()` in `packages/domain/src/job-activities/` with unit test + comment pointing at `rechainFollowers` (avoids logic drift — the known risk here).
   - Keep `canMove` gating (`scheduled|confirmed`).
3. **Click-empty-day create**: empty cell space opens `QuickCreateDialog.tsx` prefilled with date (+ assignee in lane mode, + active customer/project filters), submitting via existing `createScheduleEventAction`.
4. **Event popup** `EventPopover.tsx`: click event → popup (not navigation): details, "Mark complete" (→ `POST .../events/{id}/finish`; verify `job-activity-scheduled-event.listener.ts` syncs activity status), "Open job activity" link, "Open event" link.

**Tests**: `tests/integration/calendar-drag-rechain.test.ts` — reuse `autoschedule.test.ts` setup; reschedule endpoint moves followers + marks manual override; standalone-event PATCH moves nothing else. Unit test `movableFollowers()`.

**Verify**: drag autoscheduled Template → dialog lists Cut/Fab/Install → confirm → all shift. Lane drag reassigns. Empty-Tuesday click → prefilled form. Popup mark-complete updates color.

---

## Phase 5 — Capacity & ops: daily hours, sq-ft totals, batch update, print, map

No migration.

**OpenAPI/API**: new `GET /events/day-summaries?from&to` → `{ data: [{ date, totalHours, totalEvents, sqftByAppointmentType: {fabrication, install, template, ...} }] }`.
- Extract `PROJECT_MATERIAL_SQFT` CTE from `apps/api/src/reports/reports.service.ts` into `apps/api/src/reports/project-material-sqft.sql.ts`; both modules import it.
- SQL: events in range LEFT JOIN `(${PROJECT_MATERIAL_SQFT}) pm ON pm.project_id = se.project_id`, GROUP BY `se.scheduled_at::date, se.appointment_type`, SUM duration_minutes + pm.sqft.
- Also add nullable `sqft` to `CalendarEventItem` (same join) so Phase 3's `sqft` display field lights up.

**Web**:
- `DaySummaryRow.tsx` under each day header: hours / events / fab sqft / install sqft (fetched in `page.tsx`).
- **Batch update**: toolbar toggle → checkboxes on cards → floating bar "Reschedule ±N days | Reassign to…". `batchUpdateEventsAction(items, op)`: sequential loop; activity-linked items → reschedule endpoint, others PATCH; collect + report per-item failures; JSDoc notes non-atomicity.
- **Print**: `@media print` rules in `globals.css` (hide app shell/nav/panels, force wrap, b/w borders) + Print button → `window.print()`.
- **Map**: `apps/web/src/lib/map-links.ts` → `https://www.google.com/maps/dir/${addresses.map(encodeURIComponent).join('/')}` from day's addresses (dedupe, skip blanks); "Map day" button per column. No API key.

**Tests**: `tests/integration/calendar-day-summaries.test.ts` — seed quote with material lines + project events; sqft sums match `PROJECT_MATERIAL_SQFT` semantics, grouped by appointment type; hours sum. Unit test map-links URL building.

**Verify**: fab day sqft matches quote; batch-shift 3 events +2 days; clean print preview; map link opens multi-stop directions.

---

## Phase 6 — Availability blocks + Calendar settings

**Migration `db/migrations/066_create_availability_blocks_and_app_settings.sql`**:

```sql
CREATE TABLE IF NOT EXISTS availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignee_id uuid REFERENCES assignees(id) ON DELETE CASCADE,  -- NULL = whole shop (holiday)
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT availability_blocks_range_check CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS availability_blocks_range_idx ON availability_blocks (starts_at, ends_at);

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL
);
INSERT INTO app_settings (key, value) VALUES
  ('calendar', '{"version":1,"workDays":[1,2,3,4,5],"workDayStart":"07:00","workDayEnd":"17:00"}')
ON CONFLICT (key) DO NOTHING;
```

**Domain**: `packages/domain/src/scheduling/availability-block.types.ts` + schemas; `calendarSettingsSchema` (`workDays: number[] 0–6`, `workDayStart/End HH:MM`).

**OpenAPI**: `/availability-blocks` GET (`from`,`to`,`assigneeId?`) + POST; `/availability-blocks/{blockId}` PATCH + DELETE; `/settings/calendar` GET + PUT (PUT `@Roles('admin')` — precedent `apps/api/src/customers/customers.controller.ts:116`).

**API**: new modules `apps/api/src/availability-blocks/` and `apps/api/src/settings/`; register in `app.module.ts`.

**Web**:
- Blocks render as gray hatched bands: shop-wide → day column header shade; per-assignee → lane shade (groupBy assignee) or gray pseudo-card (week view). Fetched in `page.tsx` with same from/to.
- Non-work days grayed + "Closed" label.
- New admin page `apps/web/src/app/admin/calendar-settings/page.tsx` + `_actions.ts`: work days checkboxes, hours inputs, availability-block list/create/delete.

**Tests**: `availability-blocks.test.ts` (CRUD + range query); `app-settings.test.ts` (default seed; admin PUT 200; non-admin PUT 403).

**Verify**: block crew Thursday → gray band in lane; Saturday non-workday grayed; non-admin blocked from settings.

---

## Phase 7 — Job Views: `/jobs` list with saved column views

**Migration `db/migrations/067_seed_job_list_view.sql`**: seed one shared job-list view:

```sql
INSERT INTO calendar_views (name, view_kind, owner_user_id, is_shared, config)
VALUES ('All Jobs','job_list',NULL,true,
 '{"version":1,"columns":["jobNumber","title","accountName","pipelineStage","nextActivity","status","address","sqft"],"sortBy":"nextActivity","sortDirection":"asc"}');
```

**Domain**: `packages/domain/src/projects/job-list.types.ts` — `JOB_LIST_COLUMN_VALUES = ['jobNumber','title','accountName','pipelineStage','nextActivity','nextActivityDate','status','address','sqft']`; `JobListRow { projectId, jobNumber, title, customerId, accountName, pipelineStage, status, jobAddress, nextActivityTitle, nextActivityAt, materialSqft }`; `listJobRowsSchema { search?, statuses?, pipelineStages?, customerId?, sortBy, sortDirection, limit default 200 max 500 }`.

**OpenAPI**: `GET /projects/job-list` → `{ data: JobListRow[] }` (coexists with `/projects/archived` precedent).

**API**: extend `apps/api/src/projects/` — `@Get('job-list')` declared BEFORE any `@Get(':projectId')` route; repository `listJobRows`:

```sql
WITH next_activity AS (
  SELECT DISTINCT ON (ja.project_id) ja.project_id, ja.title, se.scheduled_at
  FROM job_activities ja JOIN scheduled_events se ON se.id = ja.scheduled_event_id
  WHERE ja.deleted_at IS NULL AND se.deleted_at IS NULL
    AND ja.status IN ('scheduled','confirmed') AND se.scheduled_at >= now()
  ORDER BY ja.project_id, se.scheduled_at ASC
), material_sqft AS ( ${PROJECT_MATERIAL_SQFT} )
SELECT p.id, p.job_number, p.title, p.status, p.pipeline_stage, p.job_address..., c.id, c.name,
       na.title AS next_activity_title, na.scheduled_at AS next_activity_at,
       COALESCE(ms.sqft,0) AS material_sqft
FROM projects p JOIN customers c ON c.id = p.customer_id
LEFT JOIN next_activity na ON na.project_id = p.id
LEFT JOIN material_sqft ms ON ms.project_id = p.id
WHERE p.deleted_at IS NULL /* + filters */
ORDER BY <whitelisted sortBy> <dir> LIMIT $n
```

Confirm exact `projects` column names (job_address: migration 027; pipeline_stage: migration 054). Whitelist `sortBy` — reject unknown with 400.

**Web**: new `apps/web/src/app/jobs/page.tsx` + `JobListTable.tsx` + `_actions.ts`:
- Extract `ViewSelector` from `app/schedule/` to `apps/web/src/components/view-selector.tsx`, parameterized by `viewKind`; column-picker variant of CustomizePanel.
- Sortable headers (click toggles asc/desc → URL → server refetch); columns per view config; job title links `/projects/{id}`, account links `/customers/{id}`.
- Add `/jobs` to nav in `apps/web/src/components/app-shell.tsx`.

**Tests**: `job-list.test.ts` — next-activity = earliest upcoming scheduled/confirmed, ignores completed; sqft matches material lines; unknown sortBy → 400; job_list view CRUD.

**Verify**: /jobs shows stage + next activity + sqft; hide column, save view; sort by next activity.

---

## Biggest risk

Phase 3's `ScheduleCalendar.tsx` refactor (503 lines → config-driven). Mitigation baked in: extract `EventCard` / `colorForEvent` / layout pieces FIRST with the week view pixel-identical under default config, then add modes.

## End-to-end verification (after all phases)

1. `pnpm test && pnpm typecheck` green.
2. `pnpm dev` from root (web on 3000). Sign in.
3. Calendar: default view loads → switch seeded views → customize (range, filters, fields, color-by) → Save As My View → set default → reload.
4. Drag autoscheduled activity → follower confirm → chain shifts (check job activity editor dates).
5. Assignee-lane view: drag between lanes reassigns.
6. Day summaries show hours + fab/install sqft matching a known quote.
7. Batch-shift 3 events; print preview; map link.
8. Availability block + Saturday closed render.
9. /jobs: sort, customize columns, save job-list view.
