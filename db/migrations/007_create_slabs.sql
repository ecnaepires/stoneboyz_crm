CREATE TABLE IF NOT EXISTS slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_slab_id uuid REFERENCES slabs(id) ON DELETE SET NULL,
  stone_type text NOT NULL,
  finish text NOT NULL,
  quality_grade text NOT NULL,
  length_in numeric(8,3) NOT NULL,
  width_in numeric(8,3) NOT NULL,
  thickness_cm numeric(4,1) NOT NULL,
  lot_number text,
  bundle_number text,
  warehouse_location text,
  cost_cents integer NOT NULL DEFAULT 0,
  image_urls text[] NOT NULL DEFAULT '{}',
  notes text,
  status text NOT NULL DEFAULT 'available',
  deleted_at timestamptz,
  deleted_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slabs_status_check CHECK (status IN ('available', 'reserved', 'cut', 'remnant')),
  CONSTRAINT slabs_finish_check CHECK (finish IN ('polished', 'honed', 'brushed', 'leathered', 'sandblasted')),
  CONSTRAINT slabs_quality_check CHECK (quality_grade IN ('A', 'B', 'C')),
  CONSTRAINT slabs_stone_type_not_empty CHECK (length(trim(stone_type)) > 0),
  CONSTRAINT slabs_length_positive CHECK (length_in > 0),
  CONSTRAINT slabs_width_positive CHECK (width_in > 0),
  CONSTRAINT slabs_thickness_positive CHECK (thickness_cm > 0),
  CONSTRAINT slabs_cost_non_negative CHECK (cost_cents >= 0)
);

CREATE INDEX IF NOT EXISTS slabs_status_updated_idx
  ON slabs (status, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS slabs_stone_type_idx
  ON slabs (stone_type, updated_at DESC)
  WHERE deleted_at IS NULL;
