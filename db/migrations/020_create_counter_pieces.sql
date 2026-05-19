CREATE TABLE IF NOT EXISTS counter_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_area_id uuid NOT NULL REFERENCES quote_areas(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  name text,
  length_in numeric NOT NULL,
  width_in numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT counter_pieces_length_positive CHECK (length_in > 0),
  CONSTRAINT counter_pieces_width_positive CHECK (width_in > 0),
  CONSTRAINT counter_pieces_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS counter_pieces_quote_area_id_sort_idx
  ON counter_pieces (quote_area_id, sort_order ASC, created_at ASC);
