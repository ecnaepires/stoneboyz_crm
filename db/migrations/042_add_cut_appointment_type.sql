ALTER TABLE scheduled_events DROP CONSTRAINT IF EXISTS scheduled_events_appointment_type_check;

ALTER TABLE scheduled_events
  ADD CONSTRAINT scheduled_events_appointment_type_check
  CHECK (appointment_type IN ('template', 'deposit', 'material', 'cut', 'fabrication', 'install', 'invoice', 'repair', 'other'));
