UPDATE job_templates
SET
  activity_specs = '[
    {"sortOrder":1,"title":"Template","eventType":"appointment","appointmentType":"template","templateKind":"physical_template","durationMinutes":90,"notes":null},
    {"sortOrder":2,"title":"Deposit","eventType":"appointment","appointmentType":"deposit","templateKind":null,"durationMinutes":30,"notes":null},
    {"sortOrder":3,"title":"Material","eventType":"appointment","appointmentType":"material","templateKind":null,"durationMinutes":60,"notes":null},
    {"sortOrder":4,"title":"Cut","eventType":"appointment","appointmentType":"cut","templateKind":null,"durationMinutes":60,"notes":null},
    {"sortOrder":5,"title":"Fabrication","eventType":"appointment","appointmentType":"fabrication","templateKind":null,"durationMinutes":120,"notes":null},
    {"sortOrder":6,"title":"Install","eventType":"appointment","appointmentType":"install","templateKind":null,"durationMinutes":120,"notes":null},
    {"sortOrder":7,"title":"Invoice","eventType":"appointment","appointmentType":"invoice","templateKind":null,"durationMinutes":15,"notes":null},
    {"sortOrder":8,"title":"Repair","eventType":"appointment","appointmentType":"repair","templateKind":null,"durationMinutes":60,"notes":null}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'standard-job';
