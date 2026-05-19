CREATE TABLE IF NOT EXISTS drawing_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_area_id uuid NOT NULL REFERENCES quote_areas(id) ON DELETE CASCADE,
  revision_number integer NOT NULL DEFAULT 1,
  layout jsonb NOT NULL DEFAULT '{"pieces":[],"sinks":[]}',
  created_by_user_id text NULL REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drawing_revisions_revision_positive CHECK (revision_number > 0)
);

CREATE INDEX IF NOT EXISTS drawing_revisions_quote_area_id_rev_idx
  ON drawing_revisions (quote_area_id, revision_number DESC);

CREATE UNIQUE INDEX IF NOT EXISTS drawing_revisions_quote_area_rev_unique
  ON drawing_revisions (quote_area_id, revision_number);
