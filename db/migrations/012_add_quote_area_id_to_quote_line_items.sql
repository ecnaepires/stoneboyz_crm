ALTER TABLE quote_line_items
  ADD COLUMN IF NOT EXISTS quote_area_id uuid REFERENCES quote_areas(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS quote_line_items_quote_area_id_idx
  ON quote_line_items (quote_area_id)
  WHERE quote_area_id IS NOT NULL;
