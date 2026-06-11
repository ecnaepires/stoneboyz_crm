# 0008: Assignees replace user-ID assignment with no historical backfill

Status: accepted (2026-06-09)

## Context

The desired CRM workflow separates Assignees (people, teams, crews, trucks,
equipment, machines, departments, contractors) from login Users. Until now,
`scheduled_events.assignee_user_ids` stored an array of user IDs and a CHECK
constraint required at least one assignee per event, which made non-user
resources impossible to schedule and forced every event onto a login user.

## Decision

Migration `064_create_assignees.sql`:

- New `assignees` table (typed resources, optional `linked_user_id` to a login
  user) and `scheduled_event_assignees` join table.
- Seed one person-type Assignee per existing login user so the picker is not
  empty on day one.
- Drop the `>= 1 assignee` CHECK constraint: events and job activities may have
  zero assignees.
- Drop the `assignee_user_ids` column outright. **Historical assignment data is
  intentionally discarded — no backfill into the join table.** The user
  explicitly decided past assignment/timing data has no value and correctness
  matters only from here forward.

## Consequences

- Past events show no assignees anywhere in the UI; "who was assigned" before
  2026-06-09 is unrecoverable from the database.
- API and domain schemas use `assigneeIds` (assignee resource IDs) instead of
  `assigneeUserIds`; clients were regenerated in the same change.
- Scheduling no longer blocks on picking a person, which autoscheduling relies
  on (autoscheduled follower events are created unassigned).
