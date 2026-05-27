CREATE TABLE IF NOT EXISTS job_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  activity_specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_templates_slug_not_empty CHECK (length(trim(slug)) > 0),
  CONSTRAINT job_templates_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT job_templates_activity_specs_is_array CHECK (jsonb_typeof(activity_specs) = 'array')
);

CREATE INDEX IF NOT EXISTS job_templates_is_default_idx
  ON job_templates (is_default)
  WHERE is_default = true;

INSERT INTO job_templates (slug, name, description, is_default, activity_specs)
VALUES
  (
    'standard-job',
    'Standard Job',
    'Default job flow with the full template, deposit, production, install, invoice, and repair activities.',
    true,
    '[
      {"sortOrder":1,"title":"Template","eventType":"appointment","appointmentType":"template","templateKind":"physical_template","durationMinutes":90,"notes":null},
      {"sortOrder":2,"title":"Deposit","eventType":"appointment","appointmentType":"deposit","templateKind":null,"durationMinutes":30,"notes":null},
      {"sortOrder":3,"title":"Material","eventType":"appointment","appointmentType":"material","templateKind":null,"durationMinutes":60,"notes":null},
      {"sortOrder":4,"title":"Fabrication","eventType":"appointment","appointmentType":"fabrication","templateKind":null,"durationMinutes":120,"notes":null},
      {"sortOrder":5,"title":"Install","eventType":"appointment","appointmentType":"install","templateKind":null,"durationMinutes":120,"notes":null},
      {"sortOrder":6,"title":"Invoice","eventType":"appointment","appointmentType":"invoice","templateKind":null,"durationMinutes":15,"notes":null},
      {"sortOrder":7,"title":"Repair","eventType":"appointment","appointmentType":"repair","templateKind":null,"durationMinutes":60,"notes":null}
    ]'::jsonb
  ),
  (
    'customer-pickup',
    'Customer Pick-up',
    'Pickup flow for finished pieces collected at the shop.',
    false,
    '[
      {"sortOrder":1,"title":"Deposit","eventType":"appointment","appointmentType":"deposit","templateKind":null,"durationMinutes":30,"notes":null},
      {"sortOrder":2,"title":"Material","eventType":"appointment","appointmentType":"material","templateKind":null,"durationMinutes":60,"notes":null},
      {"sortOrder":3,"title":"Fabrication","eventType":"appointment","appointmentType":"fabrication","templateKind":null,"durationMinutes":120,"notes":null},
      {"sortOrder":4,"title":"Invoice","eventType":"appointment","appointmentType":"invoice","templateKind":null,"durationMinutes":15,"notes":null},
      {"sortOrder":5,"title":"Customer Pick-up","eventType":"appointment","appointmentType":"other","templateKind":null,"durationMinutes":30,"notes":null}
    ]'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;
