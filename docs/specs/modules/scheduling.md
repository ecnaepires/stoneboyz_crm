# Scheduling Module

## Purpose

Scheduling module owns calendar events for Stoneboyz operations.

A scheduled event represents either a customer site visit (appointment) or an internal shop fabrication job. Events are always tied to a customer and optionally to a project. This module answers:
- What work is scheduled, and when?
- Is this a site visit or an internal job?
- Who from the crew is assigned?
- What stage is the work in?
- Which customer and project does this belong to?

## Entities (what data exists)

### ScheduledEvent

A single calendar event — either a customer-facing appointment or an internal shop job.

Fields:
- `id`: UUID
- `customerId`: UUID — required FK to customers
- `projectId`: UUID — optional FK to projects, nullable
- `eventType`: one of `appointment`, `shop_job`
- `appointmentType`: one of `measure`, `template`, `install`, `follow_up`, `other` — required when `eventType = appointment`; must be null when `eventType = shop_job`
- `title`: required string label for the event
- `scheduledAt`: required timestamptz — event start time in UTC
- `durationMinutes`: required integer, default 60, must be greater than 0
- `assigneeUserIds`: required UUID array — at least one element, no duplicates
- `address`: optional text — site address, most relevant for appointment events
- `notes`: optional text — internal notes
- `status`: one of `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`
- `archivedAt`: nullable ISO 8601 UTC timestamp exposed by API; stored as `deleted_at` in DB
- `archivedByUserId`: nullable UUID
- `createdAt`: ISO 8601 UTC timestamp
- `updatedAt`: ISO 8601 UTC timestamp

## Business Rules (what must always be true)

- `customerId` is always required regardless of `eventType`.
- `appointmentType` is required when `eventType = appointment` and must be null when `eventType = shop_job`.
- `assigneeUserIds` must contain at least one valid UUID. Duplicate IDs within the array are not allowed.
- Status transitions allowed:
  - `scheduled` → `confirmed` (via POST .../confirm)
  - `confirmed` → `in_progress` (via POST .../start)
  - `in_progress` → `completed` (via POST .../complete)
  - Any status except `completed` → `cancelled` (via POST .../cancel)
  - No back-transitions are allowed (e.g. `confirmed` cannot return to `scheduled`).
- Rescheduling (`scheduledAt` updated via PATCH) is only allowed when status is `scheduled` or `confirmed`.
- Archiving (soft delete) is only allowed when status is `completed` or `cancelled`.
- When a customer is archived, their scheduled events are NOT automatically archived.
- Archived events are excluded from normal reads (`WHERE deleted_at IS NULL`).
- Events must be emitted after successful transaction commit only.
- `actorUserId` is required on all mutating requests.

## API Endpoints (what operations exist)

Base path: `/customers/{customerId}/events`

- `actorUserId` (string UUID) is required on all mutating requests. It identifies the user performing the operation and is used for event emission.
- `GET /customers/{customerId}/events`: List events for a customer with cursor pagination and filtering. Default sort: `scheduledAt` ASC.
- `POST /customers/{customerId}/events`: Create a scheduled event.
- `GET /customers/{customerId}/events/{eventId}`: Get event detail.
- `PATCH /customers/{customerId}/events/{eventId}`: Update event fields (only when status is `scheduled` or `confirmed`).
- `POST /customers/{customerId}/events/{eventId}/confirm`: Transition status from `scheduled` to `confirmed`.
- `POST /customers/{customerId}/events/{eventId}/start`: Transition status from `confirmed` to `in_progress`.
- `POST /customers/{customerId}/events/{eventId}/complete`: Transition status from `in_progress` to `completed`.
- `POST /customers/{customerId}/events/{eventId}/cancel`: Transition status to `cancelled` (allowed from any status except `completed`).
- `POST /customers/{customerId}/events/{eventId}/archive`: Soft-delete event (only when status is `completed` or `cancelled`).

List filters:
- `eventType`
- `status`
- `projectId`
- `from` (ISO date — filter events with `scheduledAt` on or after this date)
- `to` (ISO date — filter events with `scheduledAt` on or before this date)

List pagination:
- Cursor-based, default page size 25.
- Default sort: `scheduledAt` ASC.

## Events (what this module emits)

Event names follow `entity.action` format.

- `scheduled_event.created`: Event created.
- `scheduled_event.updated`: Event fields changed.
- `scheduled_event.confirmed`: Event transitioned to confirmed.
- `scheduled_event.started`: Event transitioned to in_progress.
- `scheduled_event.completed`: Event transitioned to completed.
- `scheduled_event.cancelled`: Event transitioned to cancelled.
- `scheduled_event.rescheduled`: `scheduledAt` changed via PATCH — emitted in addition to `scheduled_event.updated`.
- `scheduled_event.archived`: Event soft-deleted.

Minimum event payload fields:
- `eventId`: UUID
- `occurredAt`: ISO 8601 UTC timestamp
- `version`: integer
- `data.scheduledEventId`: UUID
- `data.customerId`: UUID
- `data.actorUserId`: UUID

Additional payload fields per event type:
- `scheduled_event.updated`: `data.changedFields` — array of field names that changed
- `scheduled_event.rescheduled`: `data.previousScheduledAt`, `data.newScheduledAt`

## Moraware Production Expansion

This section is planning guidance, not current v1 API contract. Current `ScheduledEvent` is enough for simple appointments and shop jobs; Moraware parity needs a richer production model.

### New entities to specify

- `Job`: first-class production record with job number, job name, customer/account, salesperson, creation date, notes, job address, account contacts, linked quotes/orders, files, issues, forms, and external access.
- `JobActivity`: scheduled operational step linked to a job; examples include Template, Deposit, Material, Fabrication, Install, Invoice, Repair, Phone call, Email, and Customer Pick-up.
- `ActivityType`: configurable type with sequence, color, default status, default duration, dependency rules, and active/inactive state.
- `ActivityStatus`: configurable state with sequence, abbreviation, color, and semantic type such as auto-schedule, active, complete, or canceled.
- `Assignee`: schedulable worker/vendor/customer entry with sequence, color, description, active/inactive state, and optional map start location.
- `JobTemplate`: creates default activities and forms for Standard Job, Standard Phase, Standard Lead, and Customer Pick-up flows.
- `JobForm`: configurable form instance attached to a job or activity.
- `JobFormField`: checkbox, text, number, date, dropdown, or linked quote/order/area field.
- `JobIssue`: production blocker or repair/warranty note linked to job and optional activity.
- `ActivityPacket`: print/preview bundle of job/activity forms for crew execution.

### Fabrication activity requirements

- Fabrication must support status, start date, scheduled time, duration, assignee, and notes.
- Status options must cover Auto-Schedule, Tentative, Confirmed, In Progress, Complete, and Canceled.
- Helper actions must be modeled where useful: Today, Current Time, End Now, and Myself.
- Fabrication schedule views need daily total hours and related order/area square footage.
- Activity changes must be auditable.

### Form requirements

- Job Checklist fields observed: Deposit received, Tearout, Ready to Template, Approved for Install.
- Order Area Details fields observed: sink type, sink in stock, faucet info, notes, remake/rework.
- Dropdown fields must support configured values plus controlled custom-value creation.
- Form definitions and form responses should be separate records.
- Linked order/area fields should display from quote/order data instead of being duplicated by hand.

### Calendar requirements

- Calendar views must support Standard, Fabrication, Install, Template, and Customer Pick-up.
- Filters must include date range, activity type, assignee, project/job, and status.
- Batch update must be explicit and reversible where possible.
- Map and print packet flows should preview before mutating or printing.

### Harness requirements

- Integration tests for creating jobs from accepted quotes, adding activities, scheduling Fabrication, changing activity status, and preserving invalid transition conflicts.
- Integration tests for configurable forms and form responses.
- Browser/E2E tests for job detail, fabrication schedule edit, checklist edit, order area details edit, and calendar fabrication view.
- Golden seed must include a job with Template, Deposit, Material, Fabrication, Install, Invoice, and Repair activities.

## Open Questions

1. Should `assigneeUserIds` be validated against an existing users table, or accepted as free-form UUIDs in v1?
2. Should there be a hard cap on `durationMinutes` (e.g. max 480 = 8 hours)?
3. Should overlapping appointments for the same assignee be detected and warned at creation time?
4. Should completed events be editable (e.g. to add notes after the job is done)?
5. Should events support recurring patterns (weekly, bi-weekly, etc.) in v1, or is that deferred?
