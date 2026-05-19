CREATE TABLE IF NOT EXISTS edge_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_area_id uuid NOT NULL REFERENCES quote_areas(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  length_in numeric NOT NULL,
  treatment text NOT NULL,
  splash_height_in numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT edge_segments_length_positive CHECK (length_in > 0),
  CONSTRAINT edge_segments_splash_height_positive CHECK (splash_height_in IS NULL OR splash_height_in > 0),
  CONSTRAINT edge_segments_treatment_check CHECK (treatment IN ('unfinished', 'finished', 'appliance', 'mitered', 'waterfall'))
);

CREATE INDEX IF NOT EXISTS edge_segments_quote_area_id_sort_idx
  ON edge_segments (quote_area_id, sort_order ASC, created_at ASC);
