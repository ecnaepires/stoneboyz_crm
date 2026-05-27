DO $$
BEGIN
  CREATE TYPE issue_type AS ENUM (
    'workmanship',
    'material',
    'measurement',
    'scheduling',
    'communication',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES phases(id) ON DELETE SET NULL,
  type issue_type NOT NULL,
  severity issue_severity NOT NULL DEFAULT 'medium',
  status issue_status NOT NULL DEFAULT 'open',
  description text NOT NULL,
  reported_by_user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  reported_at timestamptz NOT NULL DEFAULT now(),
  assignee_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  deleted_at timestamptz,
  deleted_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT issues_description_not_empty CHECK (length(trim(description)) > 0),
  CONSTRAINT issues_resolved_at_status_check CHECK (
    resolved_at IS NULL OR status IN ('resolved', 'closed')
  )
);

CREATE INDEX IF NOT EXISTS issues_customer_project_created_at_idx
  ON issues (customer_id, project_id, created_at DESC)
  WHERE deleted_at IS NULL;
