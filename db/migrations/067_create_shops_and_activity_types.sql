CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shops_slug_not_empty CHECK (length(trim(slug)) > 0),
  CONSTRAINT shops_name_not_empty CHECK (length(trim(name)) > 0)
);

INSERT INTO shops (slug, name)
VALUES ('stone-boyz', 'Stone Boyz')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, updated_at = now();

CREATE TABLE IF NOT EXISTS activity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  name text NOT NULL,
  seed_slug text,
  color text NOT NULL,
  pipeline_stage text,
  counts_square_footage boolean NOT NULL DEFAULT false,
  autoschedule_eligible boolean NOT NULL DEFAULT false,
  uses_template_kind boolean NOT NULL DEFAULT false,
  default_duration_minutes integer NOT NULL DEFAULT 60,
  sort_order integer NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_types_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT activity_types_seed_slug_not_empty CHECK (seed_slug IS NULL OR length(trim(seed_slug)) > 0),
  CONSTRAINT activity_types_color_hex_check CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  CONSTRAINT activity_types_pipeline_stage_check CHECK (
    pipeline_stage IS NULL
    OR pipeline_stage IN ('new', 'deposit', 'template', 'material', 'fabrication', 'install', 'invoice', 'done')
  ),
  CONSTRAINT activity_types_default_duration_positive CHECK (default_duration_minutes > 0),
  CONSTRAINT activity_types_sort_order_positive CHECK (sort_order > 0),
  CONSTRAINT activity_types_shop_seed_slug_unique UNIQUE (shop_id, seed_slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS activity_types_shop_lower_name_active_unique
  ON activity_types (shop_id, lower(name))
  WHERE archived_at IS NULL;

INSERT INTO activity_types (
  shop_id,
  sort_order,
  seed_slug,
  name,
  color,
  pipeline_stage,
  counts_square_footage,
  autoschedule_eligible,
  uses_template_kind,
  default_duration_minutes
)
SELECT s.id, seed.sort_order, seed.seed_slug, seed.name, seed.color, seed.pipeline_stage,
  seed.counts_square_footage, seed.autoschedule_eligible, seed.uses_template_kind, seed.default_duration_minutes
FROM shops s
CROSS JOIN (
  VALUES
    (1, 'template', 'Template', '#00ff4c', 'template', true, true, true, 90),
    (2, 'deposit', 'Deposit', '#ff0000', 'deposit', false, true, false, 30),
    (3, 'material', 'Material', '#ff00dd', 'material', false, true, false, 60),
    (4, 'cut', 'Cut', '#fecaca', NULL, true, true, false, 60),
    (5, 'fabrication', 'Fabrication', '#fde68a', 'fabrication', true, true, false, 120),
    (6, 'install', 'Install', '#bfdbfe', 'install', true, true, false, 120),
    (7, 'invoice', 'Invoice', '#cbd5e1', 'invoice', false, true, false, 15),
    (8, 'repair', 'Repair', '#fbcfe8', NULL, false, false, false, 60),
    (9, 'other', 'Other', '#d4d4d8', NULL, false, false, false, 60)
) AS seed(sort_order, seed_slug, name, color, pipeline_stage, counts_square_footage, autoschedule_eligible, uses_template_kind, default_duration_minutes)
WHERE s.slug = 'stone-boyz'
ON CONFLICT (shop_id, seed_slug) DO UPDATE
SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  pipeline_stage = EXCLUDED.pipeline_stage,
  counts_square_footage = EXCLUDED.counts_square_footage,
  autoschedule_eligible = EXCLUDED.autoschedule_eligible,
  uses_template_kind = EXCLUDED.uses_template_kind,
  default_duration_minutes = EXCLUDED.default_duration_minutes,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

ALTER TABLE scheduled_events
  ADD COLUMN IF NOT EXISTS activity_type_id uuid REFERENCES activity_types(id) ON DELETE RESTRICT;

UPDATE scheduled_events se
SET activity_type_id = at.id
FROM activity_types at
JOIN shops s ON s.id = at.shop_id
WHERE s.slug = 'stone-boyz'
  AND at.seed_slug = se.appointment_type
  AND se.appointment_type IS NOT NULL
  AND se.activity_type_id IS NULL;

ALTER TABLE job_activities
  ADD COLUMN IF NOT EXISTS activity_type_id uuid REFERENCES activity_types(id) ON DELETE RESTRICT;

UPDATE job_activities ja
SET activity_type_id = at.id
FROM activity_types at
JOIN shops s ON s.id = at.shop_id
WHERE s.slug = 'stone-boyz'
  AND at.seed_slug = ja.appointment_type
  AND ja.appointment_type IS NOT NULL
  AND ja.activity_type_id IS NULL;

ALTER TABLE scheduled_events
  DROP CONSTRAINT IF EXISTS scheduled_events_activity_type_required_check;

ALTER TABLE scheduled_events
  ADD CONSTRAINT scheduled_events_activity_type_required_check CHECK (
    (event_type = 'appointment' AND activity_type_id IS NOT NULL)
    OR (event_type = 'shop_job' AND activity_type_id IS NULL)
  );

ALTER TABLE job_activities
  DROP CONSTRAINT IF EXISTS job_activities_activity_type_id_required_check;

ALTER TABLE job_activities
  ADD CONSTRAINT job_activities_activity_type_id_required_check CHECK (
    (activity_type = 'appointment' AND activity_type_id IS NOT NULL)
    OR (activity_type = 'shop_job' AND activity_type_id IS NULL)
  );

WITH mapped AS (
  SELECT
    cv.id,
    COALESCE(cv.config->'filters', '{}'::jsonb) AS filters,
    COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(at.id::text) ORDER BY at.sort_order, at.name)
        FROM jsonb_array_elements_text(COALESCE(cv.config->'filters'->'appointmentTypes', '[]'::jsonb)) AS legacy(seed_slug)
        JOIN activity_types at ON at.seed_slug = legacy.seed_slug
        JOIN shops s ON s.id = at.shop_id AND s.slug = 'stone-boyz'
      ),
      '[]'::jsonb
    ) AS activity_type_ids
  FROM calendar_views cv
)
UPDATE calendar_views cv
SET
  config =
    (cv.config - 'showDaySubtotals')
    || jsonb_build_object(
      'version', 2,
      'showDaySubtotals', false,
      'filters', (mapped.filters - 'appointmentTypes') || jsonb_build_object('activityTypeIds', mapped.activity_type_ids)
    ),
  updated_at = now()
FROM mapped
WHERE mapped.id = cv.id;
