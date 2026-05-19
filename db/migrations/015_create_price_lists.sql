CREATE TABLE IF NOT EXISTS price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  revision integer NOT NULL DEFAULT 1,
  currency_code text NOT NULL DEFAULT 'USD',
  default_tax_rate_bps integer NOT NULL DEFAULT 0,
  default_payment_terms text,
  expiration_days integer,
  created_by_user_id uuid NOT NULL,
  deleted_at timestamptz,
  deleted_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_lists_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT price_lists_status_valid CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT price_lists_revision_positive CHECK (revision > 0),
  CONSTRAINT price_lists_default_tax_rate_valid CHECK (default_tax_rate_bps >= 0 AND default_tax_rate_bps <= 10000),
  CONSTRAINT price_lists_expiration_days_positive CHECK (expiration_days IS NULL OR expiration_days > 0)
);

CREATE INDEX IF NOT EXISTS price_lists_status_updated_at_idx
  ON price_lists (status, updated_at DESC, id ASC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS price_lists_updated_at_idx
  ON price_lists (updated_at DESC, id ASC)
  WHERE deleted_at IS NULL;
