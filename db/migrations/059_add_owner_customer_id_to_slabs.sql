-- Anchor customer-supplied material to its owning customer (ADR 0005).
-- Nullable; required at the application layer whenever ownership = 'customer_supplied'.
ALTER TABLE slabs
  ADD COLUMN IF NOT EXISTS owner_customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS slabs_owner_customer_id_idx
  ON slabs (owner_customer_id)
  WHERE owner_customer_id IS NOT NULL;
