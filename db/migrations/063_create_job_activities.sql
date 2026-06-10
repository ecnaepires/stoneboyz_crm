CREATE TABLE IF NOT EXISTS job_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  job_template_id uuid NOT NULL REFERENCES job_templates(id) ON DELETE RESTRICT,
  template_activity_key text NOT NULL,
  title text NOT NULL,
  activity_type text NOT NULL,
  appointment_type text,
  template_kind text,
  status text NOT NULL DEFAULT 'not_scheduled',
  sort_order integer NOT NULL,
  duration_minutes integer NOT NULL,
  scheduled_event_id uuid REFERENCES scheduled_events(id) ON DELETE SET NULL,
  autoschedule_state text,
  autoschedule_offset_amount integer,
  autoschedule_offset_unit text,
  depends_on_activity_id uuid REFERENCES job_activities(id) ON DELETE SET NULL,
  manual_override_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_activities_template_activity_key_not_empty CHECK (length(trim(template_activity_key)) > 0),
  CONSTRAINT job_activities_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT job_activities_activity_type_check CHECK (activity_type IN ('appointment', 'shop_job')),
  CONSTRAINT job_activities_appointment_type_check CHECK (
    appointment_type IS NULL
    OR appointment_type IN ('template', 'deposit', 'material', 'cut', 'fabrication', 'install', 'invoice', 'repair', 'other')
  ),
  CONSTRAINT job_activities_template_kind_check CHECK (
    template_kind IS NULL
    OR template_kind IN ('measurement_only', 'physical_template', 'laser_template')
  ),
  CONSTRAINT job_activities_status_check CHECK (
    status IN ('not_scheduled', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')
  ),
  CONSTRAINT job_activities_sort_order_positive CHECK (sort_order > 0),
  CONSTRAINT job_activities_duration_minutes_positive CHECK (duration_minutes > 0),
  CONSTRAINT job_activities_project_template_key_unique UNIQUE (project_id, template_activity_key)
);

CREATE INDEX IF NOT EXISTS job_activities_customer_project_idx
  ON job_activities (customer_id, project_id, sort_order ASC, id ASC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS job_activities_scheduled_event_id_idx
  ON job_activities (scheduled_event_id)
  WHERE scheduled_event_id IS NOT NULL;
