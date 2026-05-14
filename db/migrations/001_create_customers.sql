-- Rollback:
-- DROP EXTENSION IF EXISTS pgcrypto;
-- DROP TABLE IF EXISTS customers;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_kind text NOT NULL,
  name text NOT NULL,
  company_name text,
  first_name text,
  last_name text,
  display_name text,
  status text NOT NULL,
  type text NOT NULL,
  owner_user_id uuid NOT NULL,
  primary_contact_id uuid,
  billing_contact_id uuid,
  billing_address_id uuid,
  tax_id text,
  website text,
  industry text,
  company_size text,
  source text,
  tags text[] NOT NULL DEFAULT '{}',
  notes_summary text,
  phone text,
  whatsapp_phone text,
  billing_email text,
  archive_reason text,
  deleted_at timestamptz,
  deleted_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_customer_kind_check CHECK (customer_kind IN ('company', 'person')),
  CONSTRAINT customers_status_check CHECK (status IN ('lead', 'qualified', 'active', 'inactive', 'churned')),
  CONSTRAINT customers_type_check CHECK (type IN ('prospect', 'customer', 'partner', 'vendor')),
  CONSTRAINT customers_company_name_required_check CHECK (
    customer_kind <> 'company' OR company_name IS NOT NULL
  ),
  CONSTRAINT customers_first_name_required_check CHECK (
    customer_kind <> 'person' OR first_name IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_name_active_unique
  ON customers (lower(name))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_tax_id_active_unique
  ON customers (tax_id)
  WHERE tax_id IS NOT NULL AND deleted_at IS NULL;
