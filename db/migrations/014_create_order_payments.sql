CREATE TABLE IF NOT EXISTS order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  amount_cents integer NOT NULL,
  payment_method text NOT NULL,
  reference_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_payments_amount_cents_positive CHECK (amount_cents > 0),
  CONSTRAINT order_payments_method_valid CHECK (
    payment_method IN ('cash', 'check', 'mastercard', 'visa', 'american_express', 'discover', 'bank_transfer', 'echeck')
  )
);

CREATE INDEX IF NOT EXISTS order_payments_order_id_idx
  ON order_payments (order_id, payment_date DESC, created_at DESC);
