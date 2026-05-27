ALTER TABLE customer_notes
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;
