-- Rollback:
-- DROP TABLE IF EXISTS customer_addresses;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  type text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  region text,
  postal_code text,
  country text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_billing boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_addresses_type_check CHECK (
    type IN ('billing', 'shipping', 'office', 'other')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_primary_active
  ON customer_addresses (customer_id, type)
  WHERE is_primary = true AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_billing_active
  ON customer_addresses (customer_id)
  WHERE is_billing = true AND deleted_at IS NULL;

