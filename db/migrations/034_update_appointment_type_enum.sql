UPDATE scheduled_events
SET appointment_type = 'template'
WHERE appointment_type = 'measure';

UPDATE scheduled_events
SET appointment_type = 'other'
WHERE appointment_type = 'follow_up';

ALTER TABLE scheduled_events
  DROP CONSTRAINT IF EXISTS scheduled_events_appointment_type_check;

ALTER TABLE scheduled_events
  ADD CONSTRAINT scheduled_events_appointment_type_check
  CHECK (appointment_type IN ('template', 'deposit', 'material', 'fabrication', 'install', 'invoice', 'repair', 'other'));
