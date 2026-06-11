CREATE TABLE IF NOT EXISTS quote_pricing_selections (
  quote_id uuid PRIMARY KEY REFERENCES quotes(id) ON DELETE CASCADE,
  default_fabrication_item_id uuid REFERENCES price_list_items(id) ON DELETE SET NULL,
  sink_item_id uuid REFERENCES price_list_items(id) ON DELETE SET NULL,
  faucet_hole_item_id uuid REFERENCES price_list_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_area_pricing_selections (
  quote_area_id uuid PRIMARY KEY REFERENCES quote_areas(id) ON DELETE CASCADE,
  material_item_id uuid REFERENCES price_list_items(id) ON DELETE SET NULL,
  edge_item_id uuid REFERENCES price_list_items(id) ON DELETE SET NULL,
  splash_item_id uuid REFERENCES price_list_items(id) ON DELETE SET NULL,
  fabrication_item_id uuid REFERENCES price_list_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
