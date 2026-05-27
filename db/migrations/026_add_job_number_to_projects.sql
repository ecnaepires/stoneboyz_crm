ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS job_number text;

WITH numbered_projects AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS row_num
  FROM projects
  WHERE job_number IS NULL
)
UPDATE projects
SET job_number = 'SBZ-' || lpad(numbered_projects.row_num::text, 3, '0')
FROM numbered_projects
WHERE projects.id = numbered_projects.id;

CREATE UNIQUE INDEX IF NOT EXISTS projects_job_number_unique
  ON projects (job_number);

ALTER TABLE projects
  ALTER COLUMN job_number SET NOT NULL;
