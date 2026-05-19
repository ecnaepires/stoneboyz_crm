ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS price_list_id uuid REFERENCES price_lists(id) ON DELETE SET NULL;
