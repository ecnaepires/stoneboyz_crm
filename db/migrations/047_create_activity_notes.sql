CREATE TABLE IF NOT EXISTS activity_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL REFERENCES scheduled_events(id) ON DELETE RESTRICT,
  author_user_id uuid NOT NULL,
  body text NOT NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_notes_body_not_empty CHECK (length(trim(body)) > 0)
);
CREATE INDEX IF NOT EXISTS activity_notes_event_id_active_idx
  ON activity_notes (event_id, created_at DESC)
  WHERE deleted_at IS NULL;
