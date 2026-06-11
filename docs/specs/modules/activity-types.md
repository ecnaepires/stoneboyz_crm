# Activity Types Module (Shop Catalog)

Status: spec locked 2026-06-11 — ready for implementation.
Decision record: ADR 0009 (`docs/adr/0009-shop-defined-activity-types.md`).
Glossary: CONTEXT.md → Shop, Activity Type, Day Subtotal, Activity Square Footage.
Sequencing: this is slice 0 of Phase 1 — see
`docs/specs/2026-06-11-calendar-plan-reconciliation.md`. Every other Phase 1
feature builds on this catalog.

## Purpose

Each Shop owns a catalog of Activity Types ("Template", "Fabrication",
"Tearout", "Service Call"). A type is data with behavior flags — never a code
enum and never `if (type === 'fabrication')` branching. The existing
`AppointmentType` enum becomes Stone Boyz's seed data. New Shops are seeded
with the standard Moraware-like set.

This module answers:
- What kinds of activity does this Shop schedule, in what display order?
- What color does each kind render as?
- Which Pipeline Stage (if any) does completing one advance?
- Does it carry Activity Square Footage into Day Subtotals?
- Does Autoscheduling chain through it?
- What is its default duration?

## Pre-made decisions

| Decision | Choice | Why |
|---|---|---|
| Tenancy now | Minimal `shops` table, one seeded row (`stone-boyz`); `activity_types.shop_id NOT NULL` | PRD: multi-tenancy is foundational; retrofitting shop_id onto a global catalog later is the rebuild ADR 0009 forbids. No auth-level tenancy yet — API resolves "current shop" via a helper returning the single row (`ShopsService.currentShop()`); swap to session-derived later. |
| Legacy enum | Kept as a **derived compatibility field** via `seed_slug`; never a write source of truth | Old clients/URLs keep working; custom types simply have `appointmentType: null`. |
| Backfill | Yes, in the same migration (deterministic enum value → seeded type) | Unlike assignees (ADR 0008), mapping is total and mechanical. |
| Color storage | One hex `color` per type (the current border color); web derives tints (background = `color + '18'` alpha suffix, as `EventCard.tsx` does today) | Shop admins pick one color; no 4-field palette editing. |
| Delete | Never. Archive only (`archived_at`); archived types stay valid on historical data, hidden from pickers | Moraware-style retire semantics. |
| Reorder | `PATCH` with `sortOrder`; list always sorted `(sort_order, name)` | No drag-reorder endpoint needed yet. |
| Mutations | `@Roles('admin')` (precedent: `customers.controller.ts`) | Catalog edits are shop-admin acts. |
| `eventType` (`appointment`/`shop_job`) | Unchanged | Orthogonal axis; catalog replaces only `appointmentType`. |
| View configs | Bump `calendarViewConfigSchema` to `version: 2`: `filters.appointmentTypes` → `filters.activityTypeIds: uuid[]`; migration rewrites stored configs | Honors the version escape hatch built into migration 065. |

## Entities

### Shop

Minimal tenant root. Fields: `id` uuid PK, `slug` text unique not empty,
`name` text not empty, `created_at`, `updated_at`. Seed: `('stone-boyz',
'Stone Boyz')`. No CRUD API in this slice — repository + `currentShop()`
helper only.

### ActivityType

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | PK |
| `shopId` | uuid | FK `shops` ON DELETE RESTRICT, NOT NULL |
| `name` | text | not empty; unique per shop case-insensitively among non-archived |
| `seedSlug` | text \| null | identifies seeded types (`template`, `deposit`, `material`, `cut`, `fabrication`, `install`, `invoice`, `repair`, `other`); unique per shop; NULL for shop-created types; immutable; drives enum compat + Moraware importer mapping |
| `color` | text | `#rrggbb` hex, required |
| `pipelineStage` | text \| null | one of `PIPELINE_STAGE_VALUES` (`packages/domain/src/projects/project.pipeline.ts`) or null = completing it never advances the pipeline |
| `countsSquareFootage` | boolean | participates in Day Subtotal sqft rollups |
| `autoscheduleEligible` | boolean | false ⇒ Autoschedule chains skip over it: never auto-moved, never auto-placed; chain continues to the next eligible follower |
| `usesTemplateKind` | boolean | true ⇒ activities/events of this type may set `templateKind`; false ⇒ `templateKind` must be null |
| `defaultDurationMinutes` | integer | > 0; prefills quick-create and job-template editor |
| `sortOrder` | integer | > 0; display order (pickers, Day Subtotal breakdown, Job List View columns) |
| `archivedAt` | timestamptz \| null | soft retire |
| `createdAt` / `updatedAt` | timestamptz | |

Domain home: `packages/domain/src/activity-types/activity-type.types.ts` +
`activity-type.schemas.ts` (zod), exported from `packages/domain/src/index.ts`.
Zero framework imports.

## Seed catalog (per new Shop; backfill source for Stone Boyz)

Colors are the current `TASK_COLOR_PALETTE` borders (`EventCard.tsx`);
durations and pipeline mapping are the current `standard-job` template specs
and `APPOINTMENT_STAGE_MAP`.

| sortOrder | seedSlug | name | color | pipelineStage | countsSqFt | autoschedule | usesTemplateKind | defaultDuration |
|---|---|---|---|---|---|---|---|---|
| 1 | `template` | Template | `#00ff4c` | `template` | true | true | true | 90 |
| 2 | `deposit` | Deposit | `#ff0000` | `deposit` | false | true | false | 30 |
| 3 | `material` | Material | `#ff00dd` | `material` | false | true | false | 60 |
| 4 | `cut` | Cut | `#fecaca` | null | true | true | false | 60 |
| 5 | `fabrication` | Fabrication | `#fde68a` | `fabrication` | true | true | false | 120 |
| 6 | `install` | Install | `#bfdbfe` | `install` | true | true | false | 120 |
| 7 | `invoice` | Invoice | `#cbd5e1` | `invoice` | false | true | false | 15 |
| 8 | `repair` | Repair | `#fbcfe8` | null | false | false | false | 60 |
| 9 | `other` | Other | `#d4d4d8` | null | false | false | false | 60 |

`repair`/`other` get `autoscheduleEligible: false` (decision confirmed
2026-06-11): Repair sits after Invoice in the standard template, so chaining it
would auto-book a repair on every job — repairs are exceptional, demand-driven
work placed manually. Other is the catch-all; a catch-all that silently chains
moves miscellaneous activities nobody intended to move. The Customer Pick-up
activity (currently typed `other` in the pickup template) is also deliberately
manual — pickups are booked when the customer confirms, not when fabrication
shifts. If a shop wants pickups chained, it creates a dedicated "Customer
Pick-up" type with the flag on — catalog data, not a code change.

## Migration `db/migrations/067_create_shops_and_activity_types.sql` (one file, append-only)

1. `CREATE TABLE shops` + seed `stone-boyz`.
2. `CREATE TABLE activity_types` with the columns above; constraints:
   `UNIQUE (shop_id, seed_slug)`; partial unique index on
   `(shop_id, lower(name)) WHERE archived_at IS NULL`; checks for hex color,
   positive duration/sort, `pipeline_stage IN (...)`.
3. Seed the 9 rows for the Stone Boyz shop.
4. `ALTER TABLE scheduled_events ADD COLUMN activity_type_id uuid REFERENCES activity_types(id) ON DELETE RESTRICT;`
   backfill: `UPDATE scheduled_events se SET activity_type_id = at.id FROM activity_types at WHERE at.seed_slug = se.appointment_type AND se.appointment_type IS NOT NULL;`
5. Same column + backfill on `job_activities` (from its `appointment_type`).
6. Add CHECK: `event_type = 'appointment' AND activity_type_id IS NOT NULL OR event_type = 'shop_job' AND activity_type_id IS NULL`
   (valid post-backfill; mirrors the existing appointment_type constraint).
   Equivalent check on `job_activities` keyed on its `activity_type` column
   (`'appointment'`/`'shop_job'`).
7. Rewrite `calendar_views.config`: for each row whose config has
   `filters.appointmentTypes`, set `version` to 2, replace that key with
   `activityTypeIds` mapped through the seeded ids, default
   `showDaySubtotals: false` (key added now; feature lands in slice 2).
8. Legacy `appointment_type` columns and their CHECK constraints **stay** (dual
   readable); a later migration drops them once nothing reads them.

## Business rules

- Every `appointment` event/activity has an `activityTypeId`; `shop_job` has none.
- `templateKind` may be non-null only when the type has `usesTemplateKind`.
- Writes accept `activityTypeId` (preferred) or legacy `appointmentType`
  (resolved via `seedSlug`); supplying both with a mismatch → 400. Reads always
  return both — `appointmentType` derived from `seedSlug`, `null` for custom types.
- An archived type is rejected for new events/activities/template specs (400);
  existing references remain valid and render normally.
- `seedSlug` is server-assigned (seeding only) — never writable through the API.
- Pipeline auto-advance reads `pipelineStage` from the completed activity's
  type row (repository join). `stageFromAppointmentType` in
  `project.pipeline.ts` is deleted once callers are rewired — no name-based
  stage logic survives.
- Autoschedule chaining (`rechainFollowers`, `movableFollowers`) skips
  followers whose type is not `autoscheduleEligible` and continues past them;
  offset math is unchanged. `movableFollowers` (pure, in domain) gains the
  flag as input.
- `EventCard.tsx` colors come from the event's type (`color` on the enriched
  payload); `TASK_COLOR_PALETTE` is deleted. Color-by-status palette is untouched.
- Quick-create and the job-template editor prefill `defaultDurationMinutes`.

## API endpoints

Base path: `/activity-types` (current shop implied via `currentShop()`).
Spec-first: add to `docs/specs/api/openapi.yaml`, then
`pnpm --filter @stoneboyz/api-client generate`; never hand-edit
`packages/api-client`.

- `GET /activity-types` → `{ data: ActivityType[] }`, sorted
  `(sortOrder, name)`; `includeArchived=true` query to include retired types.
  Any authenticated user.
- `POST /activity-types` (admin) — `{ name, color, pipelineStage?, countsSquareFootage?, autoscheduleEligible?, usesTemplateKind?, defaultDurationMinutes?, sortOrder? }`;
  defaults: flags false, duration 60, sortOrder = max+1. 409 on duplicate name.
- `GET /activity-types/{activityTypeId}` → detail.
- `PATCH /activity-types/{activityTypeId}` (admin) — any field except `seedSlug`
  and `shopId`. Renaming/flag-editing seeded types is allowed (the shop owns
  its vocabulary).
- `POST /activity-types/{activityTypeId}/archive` (admin) — sets `archivedAt`;
  409 if already archived. No unarchive in this slice (add later if asked).

Changed existing surfaces (same PR):
- `ScheduledEvent` / `CalendarEventItem` / `JobActivity` payloads gain
  `activityTypeId` (and `CalendarEventItem` gains the type's `color` + `name`
  for rendering); keep derived `appointmentType`.
- Create/update event + activity inputs accept `activityTypeId`.
- `GET /events` gains `activityTypeIds` array filter; legacy
  `appointmentTypes` param still accepted (mapped via seed slugs).
- `calendarViewConfigSchema` v2 as described; on-read `safeParse` falls back to
  defaults for unparseable configs (existing behavior).

Controller follows `scheduled-events.controller.ts` pattern: zod `safeParse`,
`badRequest(formatZodError(...))`, `@CurrentUser()`. New module
`apps/api/src/activity-types/` (module/controller/service/repository/mapper),
registered in `app.module.ts`. `shops` helper may live in the same module
folder (`shops.repository.ts`) until a real shops module exists.

## Events (emitted after commit, names in `docs/specs/events/catalog.v1.yaml`)

- `activity_type.created` — `{ activityTypeId, shopId, actorUserId, name }`
- `activity_type.updated` — `{ activityTypeId, shopId, actorUserId, changedFields }`
- `activity_type.archived` — `{ activityTypeId, shopId, actorUserId }`

## Tests (new feature = new tests)

Integration (`tests/integration/activity-types.test.ts`, real Postgres,
patterns from `assignees.test.ts` / `calendar-views.test.ts`):
1. Seeded catalog: 9 types listed in sortOrder with expected flags.
2. CRUD: create custom type ("Tearout"); duplicate name (case-insensitive) → 409;
   PATCH flags; archive hides from default list, `includeArchived` shows it.
3. Non-admin POST/PATCH/archive → 403.
4. Creating an event with an archived type → 400; with `activityTypeId` →
   response carries both id and derived `appointmentType`; legacy
   `appointmentType` write resolves to the seeded id; mismatched pair → 400.
5. `templateKind` on a type without `usesTemplateKind` → 400.
6. Backfill: pre-existing event rows (seeded via SQL in test setup) read back
   with the mapped `activityTypeId`.
7. Pipeline auto-advance still advances on completing an install-type activity
   (proves the data-driven mapping path).
8. Autoschedule: chain skips an `autoscheduleEligible: false` follower and
   still moves the next eligible one (extend `autoschedule.test.ts` setup).
9. `GET /events?activityTypeIds=...` filters; legacy `appointmentTypes` param
   still filters equivalently.

Domain unit tests: `activity-type.schemas` validation; `movableFollowers`
respects the eligibility flag; calendar view config v2 defaults +
v1-config-fallback behavior.

## Web (thin consumer of regenerated client)

- New admin page `apps/web/src/app/admin/activity-types/page.tsx` + `_actions.ts`:
  list with color swatch/flags, create/edit dialog, archive. Nav entry under admin.
- `EventCard.tsx` reads type color/name from the event payload.
- `CustomizePanel.tsx` type filter lists the catalog (id-based).
- Quick-create duration prefill from the selected type.

## Out of scope (declared direction, separate decisions later)

- Shop CRUD, auth-level tenancy, per-user shop membership.
- Shop-defined activity **statuses**, status colors, custom display fields
  (ADR 0009 names these as later siblings).
- Unarchive endpoint; dropping the legacy `appointment_type` columns;
  Moraware importer mapping UI (Phase 2).
