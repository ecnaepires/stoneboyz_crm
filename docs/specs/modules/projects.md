# Projects Module

## Purpose

Projects module owns customer work scopes before, during, and after stone fabrication work.

A project groups estimates, operational notes, ownership, and lifecycle status for a customer job.

This module answers:
- What customer job are we tracking?
- Who owns follow-up?
- What stage is the job in?
- Is the project active or archived?

## Entities

### Project

Fields:
- `id`: UUID
- `customerId`: UUID, required FK -> customers
- `title`: string, required
- `description`: string, nullable
- `status`: one of `draft`, `active`, `completed`
- `ownerUserId`: string, required
- `archivedAt`: nullable ISO 8601 UTC timestamp exposed by API; stored as `deleted_at` in DB
- `createdAt`: ISO 8601 UTC timestamp
- `updatedAt`: ISO 8601 UTC timestamp

## Business Rules

- Projects belong to exactly one customer.
- Archived customers cannot receive new projects.
- Archived projects are hidden from normal list/get/update flows.
- Project archive uses API language `archivedAt`; DB uses `deleted_at`.
- Status transitions are forward-only:
  - `draft` -> `active`
  - `draft` -> `completed`
  - `active` -> `completed`
  - `completed` is terminal.
- Updating `status` emits both `project.updated` and `project.status_changed` when status changes.
- `actorUserId` is required on all mutating requests.

## API Endpoints

Base path: `/projects`

- `GET /projects`: List active projects. Supports cursor pagination, search, status, customerId, ownerUserId, sortBy, sortDirection.
- `POST /projects`: Create project.
- `GET /projects/archived`: List archived projects.
- `GET /projects/{projectId}`: Get active project detail.
- `PATCH /projects/{projectId}`: Update project fields.
- `POST /projects/{projectId}/archive`: Archive project.

Default sort: `updatedAt` descending.

## Events

Event names follow `entity.action` format from `docs/specs/events/catalog.v1.yaml`.

- `project.created`: Project record created. Payload: `projectId`, `customerId`, `actorUserId`, `title`.
- `project.updated`: Project fields changed. Payload: `projectId`, `actorUserId`, `changedFields[]`.
- `project.archived`: Project archived. Payload: `projectId`, `customerId`, `actorUserId`.
- `project.status_changed`: Project status changed. Payload: `projectId`, `actorUserId`, `fromStatus`, `toStatus`.

Minimum event payload fields:
- `eventId`: UUID
- `occurredAt`: ISO 8601 UTC timestamp
- `version`: integer
- `data.projectId`: UUID
- `data.actorUserId`: string

## Open Questions

1. Should project ownership use Better Auth user UUIDs instead of free-form strings?
2. Should projects support restore after archive?
3. Should completed projects be immutable except archive?
