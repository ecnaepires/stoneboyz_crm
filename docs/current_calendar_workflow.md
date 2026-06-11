# Current Calendar Workflow

## Purpose

This document records how the StoneBoyz schedule/calendar works today before the Moraware/Systemize-style calendar rebuild.

Sources reviewed:

- User screenshots of the desired Moraware/Systemize calendar.
- Transcript in `Pasted text.txt` about Calendar Views and Job Views.
- `apps/web/src/app/schedule/page.tsx`
- `apps/web/src/app/schedule/ScheduleCalendar.tsx`
- `apps/web/src/app/schedule/_actions.ts`
- `apps/web/src/lib/schedule-links.ts`
- `docs/specs/modules/scheduling.md`
- `docs/superpowers/plans/2026-06-09-core-scheduling-loop.md`
- `packages/domain/src/scheduling/scheduled-event.schemas.ts`
- `packages/domain/src/scheduling/scheduled-event.types.ts`

## Current User Flow

The user opens the sidebar item labeled `Scheduling`, which routes to `/schedule`.

The schedule page currently shows:

- A month grid.
- Previous month, Today, and next month controls.
- A selected-day agenda below the month grid.
- A right-side `Add To Calendar` form.
- A task color legend.
- A compact agenda list for the selected day.

## Current Calendar Layout

The main view is a custom React calendar, not a third-party calendar package.

The month grid is built in `apps/web/src/app/schedule/page.tsx`:

- `monthGridStart` finds the Monday-start grid boundary.
- `buildMonthDays` creates 42 calendar cells.
- Each cell shows up to four event chips.
- Clicking a day changes the `date` query string and selects that date.

The selected-day agenda is built in `apps/web/src/app/schedule/ScheduleCalendar.tsx`:

- It shows hours from 7 AM through 6 PM.
- Scheduled events are positioned by start time.
- Event height is based on `durationMinutes`.
- Clicking a linked job activity opens `/projects/{projectId}/activities/{jobActivityId}`.
- Clicking a standalone event opens `/customers/{customerId}/events/{eventId}`.

## Current Data Flow

The schedule page loads:

- Up to 100 customers from `/customers`.
- Up to 100 jobs/projects from `/projects`.
- Assignees from `/assignees`.
- Calendar views from `/calendar-views`.
- Scheduled events from shop-wide `/events`.

The `/events` request always uses a required date range. View filters and URL
filters are sent to the backend when present:

- Event type.
- Appointment type.
- Status.
- Assignee.
- Account/customer.
- Job/project.
- Hide completed.

Events are normalized into `CalendarEvent` records with:

- Account/customer name.
- Job/project title.
- Optional job activity id.
- Event type.
- Appointment type.
- Title.
- Start time.
- Duration.
- Assignee ids.
- Address.
- Status.

## Current Event Model

The domain model uses `ScheduledEvent`.

Important fields:

- `customerId`
- `projectId`
- `jobActivityId`
- `eventType`: `appointment` or `shop_job`
- `appointmentType`: `template`, `deposit`, `material`, `cut`, `fabrication`, `install`, `invoice`, `repair`, or `other`
- `scheduledAt`
- `durationMinutes`
- `assigneeIds`
- `status`: `scheduled`, `confirmed`, `in_progress`, `completed`, or `cancelled`

Current rule:

- `appointmentType` is required for appointment events.
- `appointmentType` must be null for shop jobs.
- Assignees may be empty.

## Current Create Flow

The right-side form creates a scheduled event through `createScheduleEventAction`.

Current form fields:

- Customer
- Job
- Type
- Task
- Date
- Time
- Minutes
- Address
- Assignees

The form posts to `/customers/{customerId}/events`.

After save, the app redirects back to `/schedule` with date/customer/job/task query params.

## Current Colors

Task colors live in `TASK_COLOR_PALETTE` in `ScheduleCalendar.tsx`.

Colors are keyed by appointment type:

- Template
- Deposit
- Material
- Cut
- Fabrication
- Install
- Invoice
- Repair
- Other

The current color system is soft background and border color. It does not match the desired Moraware-style strong top border/status strip yet.

## Current Gaps

The current calendar does not yet match the requested screenshots.

Missing:

- Week-style production calendar focused on work activities.
- Calendar view selector.
- Saved calendar views.
- Customize calendar view panel.
- Display type options such as day by assignee, week by activity, or install schedule.
- Activity type filters.
- Assignee filters.
- Status filters.
- Search bar.
- Top toolbar actions like Views, Customize, Save View, Map, Multiple, Print, and Appointment.
- Daily summary rows for hours and order area square footage.
- Dense multi-line activity cards like the screenshot.
- Color-coded strong activity/status strips.
- Drag-and-drop rescheduling.
- Dragging an activity to a different assignee.
- Wrap text toggle.
- Auto refresh toggle.
- Calendar cards based only on job activities.
- Saved shared views vs personal views.
- Print packet preview.
- Map view.

## Current Naming Notes

The UI is moving toward shop language:

- Account is the user-facing term.
- Job is the user-facing term.
- Code still often uses `customer` and `project`.

For the calendar rebuild, visible copy should prefer Account and Job while keeping backend model names stable unless a deeper rename is explicitly planned.
