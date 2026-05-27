DO $$
BEGIN
  CREATE TYPE attachable_type AS ENUM ('job', 'quote', 'customer', 'activity', 'issue');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE attachment_category AS ENUM ('photo', 'document', 'template', 'drawing', 'invoice', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  attachable_type attachable_type NOT NULL,
  attachable_id uuid NOT NULL,
  category attachment_category NOT NULL DEFAULT 'other',
  label text,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attachments_file_path_not_empty CHECK (length(trim(file_path)) > 0)
);

CREATE INDEX IF NOT EXISTS attachments_customer_attachable_created_at_idx
  ON attachments (customer_id, attachable_type, attachable_id, created_at DESC)
  WHERE deleted_at IS NULL;
