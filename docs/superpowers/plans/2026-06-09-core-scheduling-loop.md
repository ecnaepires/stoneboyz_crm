# Core Scheduling Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the desired CRM workflow's core scheduling loop: account quick-create, account/job address split, assignee resources separate from users, autoschedule engine, and calendar→activity-editor navigation.

**Architecture:** Five vertical slices in dependency order. Backend stays Customer/Project; UI says Account/Job. Assignees attach to `scheduled_events` via a join table (every scheduled job activity owns an event; standalone events covered too). Autoschedule engine lives in `JobActivitiesService`: on scheduling an anchor activity, all later `not_scheduled` activities chain at +1 business day 8:00 AM each (or template offset), state `autoscheduled`; manual reschedule flips to `manual_override` and the engine never moves overridden rows. Calendar events carry `jobActivityId` so calendar clicks open the existing activity editor page.

**Tech Stack:** Next.js App Router + server actions (`apps/web`), NestJS (`apps/api`), Zod domain (`packages/domain`), SQL migrations (`db/migrations`, append-only), OpenAPI spec-first (`docs/specs/api/openapi.yaml` → `pnpm -C packages/api-client generate`), Vitest integration tests (`tests/integration`).

**Decisions locked with user (2026-06-09 grill session):**
1. Quick-create modal: Account Name + Company/Person toggle (default Person). Person splits name → firstName/lastName; Company → companyName = name. No backend change.
2. Account Address = primary active `customer_addresses` row. Job Address = `projects.job_address_*`. Separate edits, no cross-overwrite.
3. Assignees: NO backfill of historical `assignee_user_ids` (user discarded history). Seed one person-Assignee per user (`linked_user_id`). Zero assignees allowed. Drop `assignee_user_ids` column same slice. ADR required.
4. Autoschedule: business days Mon–Fri, chained from predecessor, default next business day 08:00, placeholder times meant to be edited. No conflict detection v1. Overridden activities never auto-moved.
5. Calendar click → existing editor page `/projects/[id]/activities/[activityId]` when linked; standalone events keep event detail page. Modal later via intercepting route.

**Conventions to follow:**
- API changes are spec-first: edit `docs/specs/api/openapi.yaml`, run `pnpm -C packages/api-client generate`, never hand-edit `packages/api-client/src/schema.ts`.
- Migrations append-only: new files `064_…`, `065_…`; never edit 001–063.
- `node "user".id` is **text** (uuid-shaped), not uuid — FK columns referencing it must be text.
- Run after each slice: `pnpm typecheck && pnpm -C apps/api typecheck && pnpm -C apps/web typecheck && pnpm test`.
- Commit per slice with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Account quick-create on Create Job (web only)

**Files:**
- Create: `apps/web/src/app/projects/new/QuickCreateAccount.tsx`
- Modify: `apps/web/src/app/projects/new/page.tsx`
- Modify: `apps/web/src/app/projects/_actions.ts`

- [ ] **Step 1: Add `quickCreateAccountAction` to `apps/web/src/app/projects/_actions.ts`**

Append:

```ts
export async function quickCreateAccountAction(formData: FormData) {
  const client = await getApiClientWithAuth();

  const name = (formData.get("name") as string).trim();
  const kind = formData.get("customerKind") as "company" | "person";

  if (!name) {
    throw new Error("Account name is required");
  }

  const body =
    kind === "company"
      ? { customerKind: "company" as const, name, companyName: name }
      : (() => {
          const [firstName, ...rest] = name.split(/\s+/);
          return {
            customerKind: "person" as const,
            name,
            firstName,
            ...(rest.length > 0 ? { lastName: rest.join(" ") } : {}),
          };
        })();

  const { data, error } = await client.POST("/customers", { body });

  if (error) {
    throw new Error("Failed to create account: " + JSON.stringify(error));
  }

  redirect(`/projects/new?customerId=${data.id}`);
}
```

- [ ] **Step 2: Create `apps/web/src/app/projects/new/QuickCreateAccount.tsx`**

Client component: collapsed "+ Add Account" button that expands an inline mini-form (name + kind toggle, default person), posting to the server action. Match existing shadcn-style components.

```tsx
"use client";

import { useState } from "react";
import { quickCreateAccountAction } from "../_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function QuickCreateAccount() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Add Account
      </Button>
    );
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      <form action={quickCreateAccountAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="quick-account-name">Account Name *</Label>
          <Input id="quick-account-name" name="name" required placeholder="Mike Bath" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quick-account-kind">Type</Label>
          <Select id="quick-account-kind" name="customerKind" defaultValue="person">
            <option value="person">Person</option>
            <option value="company">Company</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm">Save Account</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Wire into `apps/web/src/app/projects/new/page.tsx`**

- Accept `searchParams: Promise<{ customerId?: string }>`, await it, pass `defaultValue={preselectedCustomerId}` to the Account `<Select>`.
- Render `<QuickCreateAccount />` directly under the Account select.
- The quick-create form must NOT nest inside the create-job `<form>` (invalid HTML). Place the component after the `</form>` close inside the same `CardContent`, visually adjacent to the Account field, or restructure so the job form wraps only its own fields. Simplest correct layout: move quick-create above the `<form>`.

- [ ] **Step 4: Verify in browser**

`pnpm dev`; open `/projects/new`; click + Add Account; create "QC Test Person"; expect redirect back with new account preselected; create job; job detail shows the account.

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm -C apps/web typecheck`
Commit: `feat(web): account quick-create on create-job screen`

---

### Task 2: Account Address vs Job Address split on job detail

**Files:**
- Modify: `docs/specs/api/openapi.yaml` (Project schema + PATCH `/projects/{projectId}` body gain `jobAddress`)
- Regenerate: `packages/api-client/src/schema.ts`
- Modify: `apps/web/src/app/projects/[id]/page.tsx:345-360`
- Create: `apps/web/src/app/projects/[id]/JobAddressCard.tsx`
- Modify: `apps/web/src/app/projects/_actions.ts`

Background: the API already returns `project.jobAddress` (mapper `apps/api/src/projects/project.mapper.ts:30-45`) and domain update schema accepts it (`packages/domain/src/projects/project.schemas.ts:42`), but the OpenAPI spec omits it, so the generated client type hides it — and the UI shows the customer's primary address labeled "Job Address" (the known bug).

- [ ] **Step 1: Add `jobAddress` to OpenAPI**

In `docs/specs/api/openapi.yaml`, find the `Project` response schema and the PATCH `/projects/{projectId}` requestBody schema. Add to both (nullable object on Project; optional nullable on PATCH):

```yaml
jobAddress:
  type: object
  nullable: true
  properties:
    line1: { type: string, nullable: true }
    line2: { type: string, nullable: true }
    city: { type: string, nullable: true }
    region: { type: string, nullable: true }
    postalCode: { type: string, nullable: true }
    country: { type: string, nullable: true }
    notes: { type: string, nullable: true }
```

Field names must match `mapJobAddress` output in `apps/api/src/projects/project.mapper.ts` exactly — read that function first and mirror it.

- [ ] **Step 2: Regenerate client + spec check**

Run: `pnpm -C packages/api-client generate && pnpm spec:check && pnpm -C packages/api-client typecheck`

- [ ] **Step 3: Add `updateJobAddressAction` to `apps/web/src/app/projects/_actions.ts`**

```ts
export async function updateJobAddressAction(projectId: string, formData: FormData) {
  const client = await getApiClientWithAuth();

  const field = (key: string) => {
    const value = (formData.get(key) as string | null)?.trim();
    return value ? value : null;
  };

  const { error } = await client.PATCH("/projects/{projectId}", {
    params: { path: { projectId } },
    body: {
      jobAddress: {
        line1: field("line1"),
        line2: field("line2"),
        city: field("city"),
        region: field("region"),
        postalCode: field("postalCode"),
        country: field("country"),
        notes: field("notes"),
      },
    },
  });

  if (error) {
    throw new Error("Failed to update job address: " + JSON.stringify(error));
  }

  revalidatePath(`/projects/${projectId}`);
}
```

(If PATCH validation rejects partial body, include current required fields the endpoint demands — check `updateProjectSchema` in `packages/domain/src/projects/project.schemas.ts`; all fields are optional there, so jobAddress-only PATCH is valid.)

- [ ] **Step 4: Create `JobAddressCard.tsx`** — client component with display + inline edit toggle (pencil icon), form fields line1/line2/city/region/postalCode/country/notes, submit via `updateJobAddressAction`.

- [ ] **Step 5: Rework job detail page address block (`page.tsx:345-360`)**

Replace single misleading card with two:
- **Account Address** card: shows `primaryAddress` (existing variable), edit icon = `<Link href={`/customers/${project.customerId}`}>` (full address management lives there). Empty state: "No account address."
- **Job Address** card: `<JobAddressCard projectId={project.id} jobAddress={project.jobAddress} />`. Empty state: "Same as account address by default — edit to set a site address." (backend copies primary on create via `resolveJobAddress`).

- [ ] **Step 6: Integration test**

Add to `tests/integration/project-api.test.ts`: PATCH project with `jobAddress`, GET returns it, customer primary address unchanged.

- [ ] **Step 7: Verify in browser, typecheck, commit**

Browser: job detail shows both cards; editing job address does not touch account address.
Run: `pnpm typecheck && pnpm -C apps/web typecheck && pnpm test`
Commit: `feat: split account address and job address on job detail`

---

### Task 3: Assignees — migration, domain, API

**Files:**
- Create: `db/migrations/064_create_assignees.sql`
- Create: `packages/domain/src/assignees/assignee.types.ts`, `assignee.schemas.ts`, `index.ts`; export from `packages/domain/src/index.ts`
- Modify: `packages/domain/src/scheduling/scheduled-event.schemas.ts` (assigneeUserIds → assigneeIds, min(1) → optional/default [])
- Create: `apps/api/src/assignees/` module (controller, service, repository, mapper)
- Modify: `apps/api/src/scheduling/scheduled-events.repository.ts`, `scheduled-event.mapper.ts`, `scheduled-events.service.ts`
- Modify: `apps/api/src/app.module.ts` (register AssigneesModule)
- Modify: `docs/specs/api/openapi.yaml` (+ `/assignees` GET/POST; events request/response swap assigneeUserIds → assigneeIds)
- Modify: `packages/domain/src/job-activities/job-activity.schemas.ts` (scheduleJobActivitySchema)
- Create: `docs/adr/XXXX-assignees-no-backfill.md` (next number in sequence; create `docs/adr/` if missing)
- Create: `tests/integration/assignees.test.ts`

- [ ] **Step 1: Migration `064_create_assignees.sql`**

```sql
CREATE TABLE IF NOT EXISTS assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  assignee_type text NOT NULL DEFAULT 'person',
  active boolean NOT NULL DEFAULT true,
  linked_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT assignees_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT assignees_type_check CHECK (
    assignee_type IN ('person', 'team', 'crew', 'truck', 'equipment', 'machine', 'department', 'contractor')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS assignees_linked_user_unique
  ON assignees (linked_user_id) WHERE linked_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS scheduled_event_assignees (
  scheduled_event_id uuid NOT NULL REFERENCES scheduled_events(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES assignees(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scheduled_event_id, assignee_id)
);

CREATE INDEX IF NOT EXISTS scheduled_event_assignees_assignee_idx
  ON scheduled_event_assignees (assignee_id);

-- Forward-only: seed a person assignee per existing login user. No backfill of
-- historical scheduled_events.assignee_user_ids (decision: history discarded).
INSERT INTO assignees (name, assignee_type, linked_user_id)
SELECT u.name, 'person', u.id FROM "user" u
ON CONFLICT DO NOTHING;

ALTER TABLE scheduled_events
  DROP CONSTRAINT IF EXISTS scheduled_events_assignee_user_ids_not_empty;

ALTER TABLE scheduled_events
  DROP COLUMN IF EXISTS assignee_user_ids;
```

Run: `pnpm db:migrate` — expect 064 applied. Also reset test DB so integration tests see it: `pnpm db:test:reset` (check script; if reset replays migrations, done).

- [ ] **Step 2: Domain `packages/domain/src/assignees/`**

`assignee.types.ts`:
```ts
export const ASSIGNEE_TYPE_VALUES = [
  'person', 'team', 'crew', 'truck', 'equipment', 'machine', 'department', 'contractor'
] as const;
export type AssigneeType = (typeof ASSIGNEE_TYPE_VALUES)[number];
```

`assignee.schemas.ts`:
```ts
import { z } from 'zod';
import { ASSIGNEE_TYPE_VALUES } from './assignee.types.js';

export const assigneeTypeSchema = z.enum(ASSIGNEE_TYPE_VALUES);

export const assigneeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  assigneeType: assigneeTypeSchema,
  active: z.boolean(),
  linkedUserId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  archivedAt: z.string().datetime({ offset: true }).nullable()
});

export const createAssigneeSchema = z.object({
  name: z.string().min(1),
  assigneeType: assigneeTypeSchema.default('person'),
  notes: z.string().min(1).optional()
});

export type Assignee = z.infer<typeof assigneeSchema>;
export type CreateAssigneeInput = z.infer<typeof createAssigneeSchema>;
```

`index.ts` re-exports both; add `export * from './assignees/index.js';` to `packages/domain/src/index.ts`. Follow the exact export pattern of `packages/domain/src/job-activities/index.ts`.

- [ ] **Step 3: Domain scheduling swap**

In `packages/domain/src/scheduling/scheduled-event.schemas.ts`:
- Replace `assigneeUserIdsSchema` (min 1, uuid) with:
```ts
const assigneeIdsSchema = z.array(z.string().uuid()).refine(
  (ids) => new Set(ids).size === ids.length,
  { message: 'Assignee IDs must be unique' }
);
```
- In `scheduledEventSchema`: `assigneeUserIds` → `assigneeIds: assigneeIdsSchema`.
- In create/update input schemas: `assigneeIds: assigneeIdsSchema.optional().default([])` for create; `.optional()` for update.
- Update `scheduled-event.types.ts` types accordingly (rename field).

In `packages/domain/src/job-activities/job-activity.schemas.ts`, `scheduleJobActivitySchema`:
```ts
assigneeIds: z.array(z.string().uuid()).refine(
  (ids) => new Set(ids).size === ids.length,
  { message: 'Assignee IDs must be unique' }
).optional().default([])
```

Fix all domain test fallout (`pnpm test` will name the files).

- [ ] **Step 4: API events repo/mapper**

`apps/api/src/scheduling/scheduled-events.repository.ts`:
- Remove `assigneeUserIds: 'assignee_user_ids'` from the column map and the insert column/param.
- `create(...)`: after inserting the event, insert join rows in the same client/transaction:
```sql
INSERT INTO scheduled_event_assignees (scheduled_event_id, assignee_id)
SELECT $1, unnest($2::uuid[])
```
- `update(...)`: when `assigneeIds` provided, `DELETE FROM scheduled_event_assignees WHERE scheduled_event_id = $1` then re-insert.
- All SELECTs gain:
```sql
COALESCE(
  (SELECT array_agg(sea.assignee_id ORDER BY sea.created_at)
     FROM scheduled_event_assignees sea
    WHERE sea.scheduled_event_id = scheduled_events.id),
  '{}'
) AS assignee_ids
```

`scheduled-event.mapper.ts`: row field `assignee_ids: string[]`, output `assigneeIds: row.assignee_ids`.

`scheduled-events.service.ts` + `job-activities.service.ts`: rename pass-through `assigneeUserIds` → `assigneeIds` (service.create call sites at `job-activities.service.ts:52,96`).

- [ ] **Step 5: API assignees module**

`apps/api/src/assignees/` mirroring `apps/api/src/job-activities/` structure: GET `/assignees` (list active, ordered by name), POST `/assignees` (create via `createAssigneeSchema`). Role guard: copy whichever roles decorator `scheduled-events.controller.ts` uses for create. Register `AssigneesModule` in `apps/api/src/app.module.ts`.

- [ ] **Step 6: OpenAPI + regen**

- Add `/assignees` GET (200: array of Assignee) and POST (201: Assignee; body name/assigneeType/notes).
- Add `Assignee` component schema mirroring domain.
- In all scheduled-event request/response schemas: `assigneeUserIds` → `assigneeIds` (array uuid, not required).
- In job-activity schedule/reschedule request bodies: same swap.

Run: `pnpm -C packages/api-client generate && pnpm spec:check`

- [ ] **Step 7: ADR**

Create `docs/adr/` if missing; next sequence number. Title: "Assignees replace user-ID assignment with no historical backfill". Status: accepted. Context: assignee≠user model from desired workflow; old `assignee_user_ids` arrays. Decision: drop column + ≥1 constraint, seed person-assignee per user, empty join table, forward-only. Consequences: historical "who was assigned" data destroyed (user-approved 2026-06-09); calendar/agenda views of past events show no assignees.

- [ ] **Step 8: Integration tests `tests/integration/assignees.test.ts`**

Follow the setup pattern of `tests/integration/slabs.test.ts` (app bootstrap + auth helper). Cover: list includes seeded user-linked assignee; create person + truck; create event with `assigneeIds: []` succeeds (zero allowed); create event with two assignees → GET returns both; duplicate ids rejected (400).

- [ ] **Step 9: Full gate + commit**

Run: `pnpm typecheck && pnpm -C apps/api typecheck && pnpm test`
Commit: `feat: assignee resources replace user-id event assignment (no backfill)` — include ADR.

---

### Task 4: Assignees — web UI swap

**Files:**
- Modify: `apps/web/src/app/schedule/ScheduleCalendar.tsx` (creation form multi-select: users → assignees; payload field rename)
- Modify: `apps/web/src/app/schedule/page.tsx` + `_actions.ts`
- Modify: `apps/web/src/app/customers/[id]/events/new/page.tsx` + its action
- Modify: `apps/web/src/app/customers/[id]/events/[eventId]/page.tsx` (display assignee names)
- Modify: `apps/web/src/app/projects/[id]/activities/[activityId]/page.tsx` + `apps/web/src/app/projects/[id]/_actions.ts` (`scheduleJobActivityAction`/`rescheduleJobActivityAction`: assignee multi-select + "Add Assignee" inline quick-create)
- Create: `apps/web/src/components/assignee-select.tsx` (shared client component: multi-select of active assignees + inline create via server action `createAssigneeAction`)

- [ ] **Step 1: Shared `AssigneeSelect`** — props: `assignees: {id, name, assigneeType}[]`, `name="assigneeIds"`, `defaultSelectedIds?`. Multi-select (match existing user multi-select markup in `ScheduleCalendar.tsx:~500`), plus collapsed "+ Add Assignee" textarea (one name per line → `createAssigneeAction` creates each line as person; spec §13 multi-line). After create, `router.refresh()`.

- [ ] **Step 2: `createAssigneeAction`** in a new `apps/web/src/app/_actions/assignees.ts` (or nearest existing actions file pattern): POST `/assignees` per non-empty line.

- [ ] **Step 3: Swap every `assigneeUserIds` usage in web** — `grep -rn "assigneeUserIds" apps/web/src` and replace with `assigneeIds` + `AssigneeSelect` fed from `GET /assignees`. Event detail/agenda views resolve names via assignee list lookup instead of user lookup. `toAssigneeUserIds` helper in `projects/[id]/_actions.ts:44` renames to `toAssigneeIds`.

- [ ] **Step 4: Verify in browser** — schedule an activity from the editor with zero assignees (works), with two (both show on event detail + calendar agenda); create "Truck 1" from the editor's Add Assignee; it appears in dropdown immediately.

- [ ] **Step 5: Gate + commit**

Run: `pnpm -C apps/web typecheck && pnpm test`
Commit: `feat(web): assignee picker with inline quick-create across scheduling UI`

---

### Task 5: Autoschedule engine

**Files:**
- Create: `packages/domain/src/scheduling/business-days.ts` + `business-days.test.ts`; export from scheduling `index.ts`
- Modify: `packages/domain/src/job-activities/job-activity.types.ts` (autoschedule state union)
- Modify: `apps/api/src/job-activities/job-activities.service.ts` (engine in `schedule()` + `reschedule()`)
- Modify: `apps/api/src/job-activities/job-activities.repository.ts` (markScheduled accepts autoscheduleState; updateScheduleDetails sets manual_override_at; new `listAutoreschedulable`)
- Test: extend `tests/integration/project-api.test.ts` (or new `tests/integration/autoschedule.test.ts`)

- [ ] **Step 1: Pure business-day helpers (TDD — write `business-days.test.ts` first)**

```ts
// business-days.ts
const DAY_MS = 24 * 60 * 60 * 1000;

const isWeekend = (date: Date): boolean => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

export const addBusinessDays = (from: Date, amount: number): Date => {
  const result = new Date(from.getTime());
  let remaining = amount;
  while (remaining > 0) {
    result.setTime(result.getTime() + DAY_MS);
    if (!isWeekend(result)) {
      remaining -= 1;
    }
  }
  return result;
};

export const nextBusinessDayAt = (from: Date, hourUtc: number): Date => {
  const next = addBusinessDays(from, 1);
  next.setUTCHours(hourUtc, 0, 0, 0);
  return next;
};
```

Tests: Fri+1 → Mon; Thu+2 → Mon; Mon+1 → Tue; time pinned to `hourUtc`. Note: v1 computes 08:00 in UTC for determinism (`DEFAULT_AUTOSCHEDULE_HOUR_UTC = 8`); shop-local timezone is a later config concern — placeholder times are meant to be edited (user decision).

- [ ] **Step 2: Constrain autoschedule state**

In `job-activity.types.ts` add `export const AUTOSCHEDULE_STATE_VALUES = ['autoscheduled', 'manual_override'] as const;` and type. In `job-activity.schemas.ts` change `autoscheduleState: z.string().nullable()` → `z.enum(AUTOSCHEDULE_STATE_VALUES).nullable()`.

- [ ] **Step 3: Engine in `JobActivitiesService.schedule()`**

After `markScheduled` succeeds, chain forward (failing integration test first):

```ts
private async autoscheduleFollowers(
  customerId: string,
  projectId: string,
  anchor: JobActivity,
  anchorScheduledAt: string,
  actorUserId: string | undefined
): Promise<void> {
  const activities = await this.jobActivitiesRepository.list(customerId, projectId);
  const followers = activities
    .filter((a) => a.sortOrder > anchor.sortOrder && a.status === 'not_scheduled' && a.scheduledEventId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let previousAt = new Date(anchorScheduledAt);
  for (const follower of followers) {
    const offsetDays = follower.autoscheduleOffsetAmount ?? 1;
    const scheduledAt = addBusinessDays(previousAt, offsetDays);
    scheduledAt.setUTCHours(DEFAULT_AUTOSCHEDULE_HOUR_UTC, 0, 0, 0);

    const event = await this.scheduledEventsService.create(customerId, {
      actorUserId,
      projectId,
      eventType: follower.activityType,
      appointmentType: follower.appointmentType,
      templateKind: follower.templateKind,
      title: follower.title,
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: follower.durationMinutes,
      assigneeIds: []
    });

    await this.jobActivitiesRepository.markScheduled(customerId, projectId, follower.id, {
      scheduledEventId: event.id,
      durationMinutes: follower.durationMinutes,
      autoscheduleState: 'autoscheduled'
    });

    previousAt = scheduledAt;
  }
}
```

Call from `schedule()` after the anchor commit; anchor itself gets `autoscheduleState: null`. Repository `markScheduled` gains optional `autoscheduleState` (writes `autoschedule_state`).

- [ ] **Step 4: Manual override on reschedule**

In `reschedule()`: when the target activity has `autoscheduleState === 'autoscheduled'`, repository `updateScheduleDetails` also sets `autoschedule_state = 'manual_override', manual_override_at = now()`. Then re-chain downstream: for followers with `autoscheduleState === 'autoscheduled'` and status `scheduled`/`confirmed`, recompute from the rescheduled activity's new time (same chain math) and `scheduledEventsService.update` each event's `scheduledAt`. Followers in `manual_override` (or completed/cancelled/in_progress) are never touched — chain math continues *through* their slot using the previous computed time, skipping the write.

- [ ] **Step 5: Integration tests**

New `tests/integration/autoschedule.test.ts` (copy bootstrap from `project-api.test.ts`):
1. Create job from Standard Job template → schedule first activity Mon 09:00 → all followers `scheduled`, each next business day 08:00 UTC, `autoscheduleState='autoscheduled'`, events exist with empty assignees.
2. Friday anchor → first follower lands Monday (weekend skip).
3. Reschedule follower #2 → its state flips `manual_override`; reschedule anchor → follower #2 untouched, follower #3 recomputed.
4. Completed follower untouched on anchor reschedule.

- [ ] **Step 6: UI surfacing (small)**

Job detail activities table + activity editor: show badge when `autoscheduleState` is `autoscheduled` ("Auto") or `manual_override` ("Edited"). Fields already in API response.

- [ ] **Step 7: Gate + commit**

Run: `pnpm typecheck && pnpm -C apps/api typecheck && pnpm test`
Commit: `feat(api): autoschedule follower activities on anchor scheduling`

---

### Task 6: Calendar → activity editor

**Files:**
- Modify: `apps/api/src/scheduling/scheduled-events.repository.ts` + `scheduled-event.mapper.ts` (LEFT JOIN job_activities → `job_activity_id`)
- Modify: `packages/domain/src/scheduling/scheduled-event.schemas.ts` (`jobActivityId: z.string().uuid().nullable()`)
- Modify: `docs/specs/api/openapi.yaml` (ScheduledEvent response + regen)
- Modify: `apps/web/src/app/schedule/page.tsx:60-81` (`jobActivityId` into `CalendarEvent`)
- Modify: `apps/web/src/app/schedule/ScheduleCalendar.tsx:44,409,651` (type + conditional href)

- [ ] **Step 1: Repo/mapper** — every event SELECT gains:

```sql
(SELECT ja.id FROM job_activities ja
  WHERE ja.scheduled_event_id = scheduled_events.id AND ja.deleted_at IS NULL
  LIMIT 1) AS job_activity_id
```
(indexed by `job_activities_scheduled_event_id_idx`). Mapper: `jobActivityId: row.job_activity_id`.

- [ ] **Step 2: Domain schema + OpenAPI + regen** (`pnpm -C packages/api-client generate && pnpm spec:check`).

- [ ] **Step 3: Calendar links** — both link sites (`ScheduleCalendar.tsx:409,651`):

```tsx
href={
  event.jobActivityId && event.projectId
    ? `/projects/${event.projectId}/activities/${event.jobActivityId}`
    : `/customers/${event.customerId}/events/${event.id}`
}
```

- [ ] **Step 4: Integration test** — events list returns `jobActivityId` for an activity-created event, `null` for a standalone event (extend `tests/integration/project-api.test.ts` scheduling block).

- [ ] **Step 5: Browser verify, gate, commit**

Calendar click on autoscheduled activity → lands in editor page with that activity; standalone event → old detail page.
Run: `pnpm typecheck && pnpm test`
Commit: `feat: calendar events open the job activity editor when linked`

---

### Task 7: Final validation

- [ ] `pnpm typecheck && pnpm -C apps/api typecheck && pnpm -C apps/web typecheck && pnpm -C packages/api-client typecheck`
- [ ] `pnpm test` (all green), `pnpm spec:check`
- [ ] `pnpm db:migrate` idempotent (0 to apply on second run)
- [ ] Full browser loop: Create Job (+quick-create account) → job detail (two address cards) → schedule first activity with assignees → followers autoscheduled on calendar → drag-free reschedule via editor → calendar click reopens editor.
- [ ] Update `HANDOFF.md` per agent-handoff-protocol.

## Self-review notes

- Spec coverage: decisions 1–5 map to Tasks 1, 2, 3+4, 5, 6 respectively. Forms/files/drag-drop intentionally out of scope.
- `assigneeIds` naming is consistent across domain/API/web in Tasks 3–6.
- Task 5 depends on Task 3's `assigneeIds: []` create path; order is mandatory.
- Risk: dirty tree (81 files) predates this work — commit plan file first, keep slices in separate commits, do not sweep unrelated dirty files into slice commits.
