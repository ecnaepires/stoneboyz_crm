-- Rollback:
-- DROP INDEX IF EXISTS projects_pipeline_stage_idx;
-- ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_pipeline_stage_check;
-- ALTER TABLE projects DROP COLUMN IF EXISTS stage_entered_at;
-- ALTER TABLE projects DROP COLUMN IF EXISTS pipeline_stage;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_pipeline_stage_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_pipeline_stage_check
  CHECK (pipeline_stage IN ('new', 'deposit', 'template', 'material', 'fabrication', 'install', 'invoice', 'done'));

UPDATE projects
SET
  stage_entered_at = created_at,
  pipeline_stage = CASE
    WHEN status = 'completed' THEN 'done'
    ELSE 'new'
  END;

CREATE INDEX IF NOT EXISTS projects_pipeline_stage_idx ON projects (pipeline_stage);
