ALTER TABLE quote_line_items
  ADD COLUMN IF NOT EXISTS slab_id uuid REFERENCES slabs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quote_line_items_slab_id_idx
  ON quote_line_items (slab_id)
  WHERE slab_id IS NOT NULL;

