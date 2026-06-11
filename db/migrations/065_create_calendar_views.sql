CREATE TABLE IF NOT EXISTS calendar_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  view_kind text NOT NULL DEFAULT 'calendar',
  owner_user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  is_shared boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT calendar_views_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT calendar_views_kind_check CHECK (view_kind IN ('calendar', 'job_list')),
  CONSTRAINT calendar_views_system_views_shared CHECK (owner_user_id IS NOT NULL OR is_shared)
);

CREATE INDEX IF NOT EXISTS calendar_views_owner_idx
  ON calendar_views (owner_user_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS calendar_views_visible_idx
  ON calendar_views (view_kind, is_shared, owner_user_id)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS user_view_defaults (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  view_kind text NOT NULL CHECK (view_kind IN ('calendar', 'job_list')),
  calendar_view_id uuid NOT NULL REFERENCES calendar_views(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, view_kind)
);

CREATE INDEX IF NOT EXISTS scheduled_events_scheduled_at_idx
  ON scheduled_events (scheduled_at)
  WHERE deleted_at IS NULL;

INSERT INTO calendar_views (name, view_kind, owner_user_id, is_shared, config)
SELECT name, 'calendar', NULL, true, config
FROM (
  VALUES
    ('All Activities', '{"version":1,"displayType":"week","filters":{},"displayFields":["projectTitle","customerName","address","activityTitle","time","status","assignees"],"colorBy":"appointmentType"}'::jsonb),
    ('Template', '{"version":1,"displayType":"week","filters":{"appointmentTypes":["template"]},"displayFields":["projectTitle","customerName","address","activityTitle","time","status","assignees"],"colorBy":"appointmentType"}'::jsonb),
    ('Fabrication', '{"version":1,"displayType":"week","filters":{"appointmentTypes":["fabrication"]},"displayFields":["projectTitle","customerName","address","activityTitle","time","status","assignees"],"colorBy":"appointmentType"}'::jsonb),
    ('Install', '{"version":1,"displayType":"week","filters":{"appointmentTypes":["install"]},"displayFields":["projectTitle","customerName","address","activityTitle","time","status","assignees"],"colorBy":"appointmentType"}'::jsonb)
) AS seed(name, config)
WHERE NOT EXISTS (
  SELECT 1
  FROM calendar_views cv
  WHERE cv.owner_user_id IS NULL
    AND cv.view_kind = 'calendar'
    AND cv.name = seed.name
    AND cv.archived_at IS NULL
);