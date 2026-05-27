CREATE TABLE IF NOT EXISTS job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  author_user_id uuid NOT NULL,
  body text NOT NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_notes_body_not_empty CHECK (length(trim(body)) > 0)
);
CREATE INDEX IF NOT EXISTS job_notes_project_id_active_idx
  ON job_notes (project_id, created_at DESC)
  WHERE deleted_at IS NULL;
