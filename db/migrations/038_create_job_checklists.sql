CREATE TABLE IF NOT EXISTS job_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL UNIQUE REFERENCES phases(id) ON DELETE CASCADE,
  deposit_received boolean NOT NULL DEFAULT false,
  tearout_required boolean NOT NULL DEFAULT false,
  tearout_completed boolean NOT NULL DEFAULT false,
  ready_to_template boolean NOT NULL DEFAULT false,
  approved_for_install boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_checklists_project_id_phase_id_idx
  ON job_checklists (project_id, phase_id);

INSERT INTO job_checklists (customer_id, project_id, phase_id)
SELECT customer_id, project_id, id
FROM phases
WHERE deleted_at IS NULL
ON CONFLICT (phase_id) DO NOTHING;
