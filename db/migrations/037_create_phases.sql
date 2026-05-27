CREATE TABLE IF NOT EXISTS phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_number integer NOT NULL,
  name text NOT NULL,
  deleted_at timestamptz,
  deleted_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT phases_phase_number_positive CHECK (phase_number > 0),
  CONSTRAINT phases_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT phases_project_id_phase_number_key UNIQUE (project_id, phase_number)
);

CREATE INDEX IF NOT EXISTS phases_customer_id_idx
  ON phases (customer_id, project_id, phase_number ASC, created_at ASC)
  WHERE deleted_at IS NULL;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS phase_id uuid;

ALTER TABLE scheduled_events
  ADD COLUMN IF NOT EXISTS phase_id uuid;

ALTER TABLE quotes
  DROP CONSTRAINT IF EXISTS quotes_phase_id_fkey;

ALTER TABLE quotes
  ADD CONSTRAINT quotes_phase_id_fkey
  FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE SET NULL;

ALTER TABLE scheduled_events
  DROP CONSTRAINT IF EXISTS scheduled_events_phase_id_fkey;

ALTER TABLE scheduled_events
  ADD CONSTRAINT scheduled_events_phase_id_fkey
  FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quotes_phase_id_idx
  ON quotes (phase_id)
  WHERE phase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS scheduled_events_phase_id_idx
  ON scheduled_events (phase_id)
  WHERE phase_id IS NOT NULL;

CREATE TEMP TABLE phase_backfill_quotes ON COMMIT DROP AS
SELECT
  q.id AS quote_id,
  q.customer_id,
  q.project_id,
  q.title AS phase_name,
  ROW_NUMBER() OVER (
    PARTITION BY q.project_id
    ORDER BY q.created_at ASC, q.id ASC
  ) AS phase_number
FROM quotes q
WHERE q.deleted_at IS NULL
  AND q.project_id IS NOT NULL;

INSERT INTO phases (customer_id, project_id, phase_number, name)
SELECT
  customer_id,
  project_id,
  phase_number,
  phase_name
FROM phase_backfill_quotes
ON CONFLICT (project_id, phase_number) DO NOTHING;

CREATE TEMP TABLE phase_backfill_projects ON COMMIT DROP AS
SELECT
  p.customer_id,
  p.id AS project_id,
  p.title AS phase_name
FROM projects p
WHERE NOT EXISTS (
  SELECT 1
  FROM phase_backfill_quotes q
  WHERE q.project_id = p.id
);

INSERT INTO phases (customer_id, project_id, phase_number, name)
SELECT
  customer_id,
  project_id,
  1,
  phase_name
FROM phase_backfill_projects
ON CONFLICT (project_id, phase_number) DO NOTHING;

UPDATE quotes q
SET phase_id = p.id,
    updated_at = now()
FROM phase_backfill_quotes src
JOIN phases p
  ON p.customer_id = src.customer_id
 AND p.project_id = src.project_id
 AND p.phase_number = src.phase_number
WHERE q.id = src.quote_id;

UPDATE scheduled_events se
SET phase_id = p.id,
    updated_at = now()
FROM phases p
WHERE se.project_id = p.project_id
  AND p.phase_number = 1;
