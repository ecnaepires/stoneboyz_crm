CREATE TABLE IF NOT EXISTS slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_slab_id uuid REFERENCES slabs(id) ON DELETE SET NULL,
  material_color_id uuid,
  storage_location_id uuid,
  inventory_receipt_id uuid,
  tag_code text,
  kind text NOT NULL DEFAULT 'full_slab',
  availability text NOT NULL DEFAULT 'available',
  ownership text NOT NULL DEFAULT 'shop_owned',
  condition text NOT NULL DEFAULT 'good',
  hold_reason text,
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
  CONSTRAINT slabs_kind_check CHECK (kind IN ('full_slab', 'remnant')),
  CONSTRAINT slabs_availability_check CHECK (availability IN ('available', 'reserved', 'cut', 'hold', 'archived')),
  CONSTRAINT slabs_ownership_check CHECK (ownership IN ('shop_owned', 'job_purchased', 'customer_supplied')),
  CONSTRAINT slabs_condition_check CHECK (condition IN ('good', 'minor_damage', 'major_damage')),
  CONSTRAINT slabs_finish_check CHECK (finish IN ('polished', 'honed', 'brushed', 'leathered', 'sandblasted')),
  CONSTRAINT slabs_quality_check CHECK (quality_grade IN ('A', 'B', 'C')),
  CONSTRAINT slabs_tag_code_not_empty CHECK (tag_code IS NULL OR length(trim(tag_code)) > 0),
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

CREATE UNIQUE INDEX IF NOT EXISTS slabs_tag_code_unique_idx
  ON slabs (tag_code)
  WHERE tag_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS slabs_kind_availability_idx
  ON slabs (kind, availability, updated_at DESC)
  WHERE deleted_at IS NULL;
