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

-- Forward-only model change: seed one person assignee per existing login user.
-- Historical scheduled_events.assignee_user_ids data is intentionally discarded
-- (no backfill) per the 2026-06-09 decision; see the accompanying ADR.
INSERT INTO assignees (name, assignee_type, linked_user_id)
SELECT u.name, 'person', u.id FROM "user" u
ON CONFLICT DO NOTHING;

ALTER TABLE scheduled_events
  DROP CONSTRAINT IF EXISTS scheduled_events_assignee_user_ids_not_empty;

ALTER TABLE scheduled_events
  DROP COLUMN IF EXISTS assignee_user_ids;
