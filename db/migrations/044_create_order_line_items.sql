CREATE TABLE IF NOT EXISTS order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quote_area_id uuid,
  slab_id uuid REFERENCES slabs(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  stone_type text NOT NULL,
  length_in numeric(8,3),
  width_in numeric(8,3),
  thickness_cm numeric(4,1),
  edge_profile text,
  qty numeric(10,4) NOT NULL,
  qty_unit text NOT NULL,
  unit_price_cents integer NOT NULL,
  labor_price_cents integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_line_items_stone_type_not_empty CHECK (length(trim(stone_type)) > 0),
  CONSTRAINT order_line_items_qty_positive CHECK (qty > 0),
  CONSTRAINT order_line_items_qty_unit_not_empty CHECK (length(trim(qty_unit)) > 0),
  CONSTRAINT order_line_items_unit_price_cents_non_negative CHECK (unit_price_cents >= 0),
  CONSTRAINT order_line_items_labor_price_cents_non_negative CHECK (labor_price_cents >= 0)
);

CREATE INDEX IF NOT EXISTS order_line_items_order_id_sort_idx
  ON order_line_items (order_id, sort_order ASC, created_at ASC);
