ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS job_template_id uuid;

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_job_template_id_fkey;

ALTER TABLE projects
  ADD CONSTRAINT projects_job_template_id_fkey
  FOREIGN KEY (job_template_id)
  REFERENCES job_templates(id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS projects_job_template_id_idx
  ON projects (job_template_id);