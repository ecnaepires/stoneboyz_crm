CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  quote_number text NOT NULL UNIQUE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  valid_until date,
  discount_cents integer NOT NULL DEFAULT 0,
  tax_rate_bps integer NOT NULL DEFAULT 0,
  notes text,
  terms_and_conditions text,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  deleted_at timestamptz,
  deleted_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotes_status_check CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  CONSTRAINT quotes_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT quotes_discount_cents_non_negative CHECK (discount_cents >= 0),
  CONSTRAINT quotes_tax_rate_bps_non_negative CHECK (tax_rate_bps >= 0)
);

CREATE INDEX IF NOT EXISTS quotes_customer_id_active_idx
  ON quotes (customer_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS quotes_project_id_idx
  ON quotes (project_id)
  WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  stone_type text NOT NULL,
  length_mm integer,
  width_mm integer,
  thickness_mm integer,
  edge_profile text,
  qty numeric(10,4) NOT NULL,
  qty_unit text NOT NULL,
  unit_price_cents integer NOT NULL,
  labor_price_cents integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_line_items_stone_type_not_empty CHECK (length(trim(stone_type)) > 0),
  CONSTRAINT quote_line_items_qty_positive CHECK (qty > 0),
  CONSTRAINT quote_line_items_qty_unit_not_empty CHECK (length(trim(qty_unit)) > 0),
  CONSTRAINT quote_line_items_unit_price_cents_non_negative CHECK (unit_price_cents >= 0),
  CONSTRAINT quote_line_items_labor_price_cents_non_negative CHECK (labor_price_cents >= 0)
);

CREATE INDEX IF NOT EXISTS quote_line_items_quote_id_sort_idx
  ON quote_line_items (quote_id, sort_order ASC, created_at ASC);
