ALTER TABLE counter_pieces
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'countertop'
    CHECK (kind IN ('countertop', 'backsplash'));
