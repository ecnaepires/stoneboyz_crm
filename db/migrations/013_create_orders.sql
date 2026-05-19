CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_number text NOT NULL UNIQUE,
  title text NOT NULL,
  sale_date date NOT NULL,
  subtotal_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  tax_rate_bps integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  notes text,
  terms_and_conditions text,
  deleted_at timestamptz,
  deleted_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT orders_subtotal_cents_non_negative CHECK (subtotal_cents >= 0),
  CONSTRAINT orders_discount_cents_non_negative CHECK (discount_cents >= 0),
  CONSTRAINT orders_tax_rate_bps_non_negative CHECK (tax_rate_bps >= 0),
  CONSTRAINT orders_total_cents_non_negative CHECK (total_cents >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_quote_id_active_unique
  ON orders (quote_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS orders_customer_id_active_idx
  ON orders (customer_id, updated_at DESC)
  WHERE deleted_at IS NULL;
