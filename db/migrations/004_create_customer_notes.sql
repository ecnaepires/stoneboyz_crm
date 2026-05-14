CREATE TABLE IF NOT EXISTS customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  author_user_id uuid NOT NULL,
  body text NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_notes_body_not_empty CHECK (length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS customer_notes_customer_id_active_idx
  ON customer_notes (customer_id, created_at DESC)
  WHERE deleted_at IS NULL;
