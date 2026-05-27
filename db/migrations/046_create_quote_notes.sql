CREATE TABLE IF NOT EXISTS quote_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE RESTRICT,
  author_user_id uuid NOT NULL,
  body text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_notes_body_not_empty CHECK (length(trim(body)) > 0)
);
CREATE INDEX IF NOT EXISTS quote_notes_quote_id_active_idx
  ON quote_notes (quote_id, created_at DESC)
  WHERE deleted_at IS NULL;
