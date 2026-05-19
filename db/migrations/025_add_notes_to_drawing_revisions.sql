ALTER TABLE drawing_revisions
  ADD COLUMN IF NOT EXISTS notes text NULL;
