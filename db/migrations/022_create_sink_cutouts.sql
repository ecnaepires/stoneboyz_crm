CREATE TABLE IF NOT EXISTS sink_cutouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_area_id uuid NOT NULL REFERENCES quote_areas(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  model text,
  sink_type text NOT NULL,
  shape text NOT NULL,
  cutout_length_in numeric NOT NULL,
  cutout_width_in numeric NOT NULL,
  faucet_hole_count integer NOT NULL DEFAULT 0,
  centerline text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sink_cutouts_quantity_positive CHECK (quantity > 0),
  CONSTRAINT sink_cutouts_cutout_length_positive CHECK (cutout_length_in > 0),
  CONSTRAINT sink_cutouts_cutout_width_positive CHECK (cutout_width_in > 0),
  CONSTRAINT sink_cutouts_faucet_hole_count_range CHECK (faucet_hole_count BETWEEN 0 AND 5),
  CONSTRAINT sink_cutouts_sink_type_check CHECK (sink_type IN ('undermount', 'drop_in', 'farm')),
  CONSTRAINT sink_cutouts_shape_check CHECK (shape IN ('rectangle', 'oval', 'double', '60_40', '40_60', '70_30', '30_70')),
  CONSTRAINT sink_cutouts_centerline_check CHECK (centerline IN ('none', 'left', 'right', 'center'))
);

CREATE INDEX IF NOT EXISTS sink_cutouts_quote_area_id_sort_idx
  ON sink_cutouts (quote_area_id, sort_order ASC, created_at ASC);
