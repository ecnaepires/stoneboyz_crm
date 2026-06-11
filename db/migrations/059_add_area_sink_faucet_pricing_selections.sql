ALTER TABLE quote_area_pricing_selections
  ADD COLUMN IF NOT EXISTS sink_item_id uuid
    REFERENCES price_list_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS faucet_hole_item_id uuid
    REFERENCES price_list_items(id) ON DELETE SET NULL;