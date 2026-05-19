CREATE TABLE IF NOT EXISTS generated_price_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_area_id uuid NOT NULL REFERENCES quote_areas(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  unit_price_cents integer NOT NULL,
  line_total_cents integer NOT NULL GENERATED ALWAYS AS (ROUND(quantity * unit_price_cents)) STORED,
  price_list_item_id uuid NULL REFERENCES price_list_items(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  override_price_cents integer NULL,
  override_reason text NULL,
  override_by_user_id text NULL REFERENCES "user"(id) ON DELETE SET NULL,
  override_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT generated_price_lines_category_check CHECK (
    category IN ('material','fabrication','finished_edge','splash','sink_cutout','sink_item','faucet_hole')
  ),
  CONSTRAINT generated_price_lines_quantity_non_negative CHECK (quantity >= 0),
  CONSTRAINT generated_price_lines_unit_price_non_negative CHECK (unit_price_cents >= 0),
  CONSTRAINT generated_price_lines_override_consistent CHECK (
    (override_price_cents IS NULL) = (override_by_user_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS generated_price_lines_quote_area_id_sort_idx
  ON generated_price_lines (quote_area_id, sort_order ASC, created_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS generated_price_lines_quote_area_category_unique
  ON generated_price_lines (quote_area_id, category);
