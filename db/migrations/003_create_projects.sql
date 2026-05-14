-- Rollback:
-- DROP TABLE IF EXISTS projects;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  owner_user_id text NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_status_check CHECK (status IN ('draft', 'active', 'completed')),
  CONSTRAINT projects_title_not_empty CHECK (length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS projects_customer_id_idx
  ON projects (customer_id);
