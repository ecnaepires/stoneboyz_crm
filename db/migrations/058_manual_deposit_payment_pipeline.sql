ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS deposit_required_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_requested_by_user_id uuid;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_deposit_required_cents_non_negative;

ALTER TABLE orders
  ADD CONSTRAINT orders_deposit_required_cents_non_negative
  CHECK (deposit_required_cents >= 0);

ALTER TABLE order_payments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'recorded',
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS void_reason text;

ALTER TABLE order_payments
  DROP CONSTRAINT IF EXISTS order_payments_status_valid;

ALTER TABLE order_payments
  ADD CONSTRAINT order_payments_status_valid
  CHECK (status IN ('recorded', 'void'));

CREATE INDEX IF NOT EXISTS order_payments_order_id_recorded_idx
  ON order_payments (order_id, payment_date DESC, created_at DESC)
  WHERE status = 'recorded';
