CREATE TABLE IF NOT EXISTS scheduled_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  appointment_type text,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  assignee_user_ids uuid[] NOT NULL DEFAULT '{}',
  address text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  deleted_at timestamptz,
  deleted_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_events_event_type_check CHECK (event_type IN ('appointment', 'shop_job')),
  CONSTRAINT scheduled_events_appointment_type_check CHECK (appointment_type IN ('measure', 'template', 'install', 'follow_up', 'other')),
  CONSTRAINT scheduled_events_appointment_type_required_check CHECK (
    (event_type = 'appointment' AND appointment_type IS NOT NULL)
    OR (event_type = 'shop_job' AND appointment_type IS NULL)
  ),
  CONSTRAINT scheduled_events_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT scheduled_events_duration_minutes_positive CHECK (duration_minutes > 0),
  CONSTRAINT scheduled_events_assignee_user_ids_not_empty CHECK (cardinality(assignee_user_ids) > 0),
  CONSTRAINT scheduled_events_status_check CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS scheduled_events_customer_id_scheduled_at_idx
  ON scheduled_events (customer_id, scheduled_at ASC, id ASC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS scheduled_events_project_id_idx
  ON scheduled_events (project_id)
  WHERE project_id IS NOT NULL AND deleted_at IS NULL;
