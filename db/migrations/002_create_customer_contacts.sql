-- Rollback:
-- DROP TABLE IF EXISTS customer_contacts;

CREATE TABLE IF NOT EXISTS customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  first_name text NOT NULL,
  last_name text,
  job_title text,
  email text,
  phone text,
  whatsapp_phone text,
  is_primary boolean NOT NULL DEFAULT false,
  is_billing boolean NOT NULL DEFAULT false,
  preferred_channel text NOT NULL DEFAULT 'none',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_contacts_preferred_channel_check CHECK (
    preferred_channel IN ('email', 'phone', 'whatsapp', 'none')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_contacts_one_primary_active
  ON customer_contacts (customer_id)
  WHERE is_primary = true AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customer_contacts_one_billing_active
  ON customer_contacts (customer_id)
  WHERE is_billing = true AND deleted_at IS NULL;

