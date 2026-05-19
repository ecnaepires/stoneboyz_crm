CREATE TABLE IF NOT EXISTS project_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slab_id uuid NOT NULL REFERENCES slabs(id) ON DELETE RESTRICT,
  consumed_by_user_id uuid,
  consumed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slab_id)
);

CREATE INDEX IF NOT EXISTS project_slabs_project_id_idx
  ON project_slabs (project_id);

CREATE INDEX IF NOT EXISTS project_slabs_slab_id_idx
  ON project_slabs (slab_id);

