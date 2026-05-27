ALTER TABLE scheduled_events
  ADD COLUMN IF NOT EXISTS template_kind text;

ALTER TABLE scheduled_events
  DROP CONSTRAINT IF EXISTS scheduled_events_template_kind_check;

ALTER TABLE scheduled_events
  ADD CONSTRAINT scheduled_events_template_kind_check
  CHECK (template_kind IS NULL OR template_kind IN ('measurement_only', 'physical_template', 'laser_template'));
