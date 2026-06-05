CREATE TABLE IF NOT EXISTS material_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_colors_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT material_colors_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS material_color_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_color_id uuid NOT NULL REFERENCES material_colors(id) ON DELETE CASCADE,
  alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_color_aliases_alias_not_empty CHECK (length(trim(alias)) > 0),
  CONSTRAINT material_color_aliases_alias_unique UNIQUE (alias)
);

CREATE TABLE IF NOT EXISTS storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL,
  rack text NOT NULL,
  bin text,
  slot text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storage_locations_zone_not_empty CHECK (length(trim(zone)) > 0),
  CONSTRAINT storage_locations_rack_not_empty CHECK (length(trim(rack)) > 0)
);

CREATE TABLE IF NOT EXISTS inventory_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor text,
  received_at timestamptz NOT NULL DEFAULT now(),
  default_material_color_id uuid REFERENCES material_colors(id) ON DELETE SET NULL,
  default_finish text,
  default_thickness_cm numeric(4,1),
  default_bundle_number text,
  default_storage_location_id uuid REFERENCES storage_locations(id) ON DELETE SET NULL,
  notes text,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE slabs
  ADD COLUMN IF NOT EXISTS material_color_id uuid,
  ADD COLUMN IF NOT EXISTS storage_location_id uuid,
  ADD COLUMN IF NOT EXISTS inventory_receipt_id uuid,
  ADD COLUMN IF NOT EXISTS tag_code text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'full_slab',
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS ownership text NOT NULL DEFAULT 'shop_owned',
  ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS hold_reason text;

CREATE TABLE IF NOT EXISTS slab_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slab_id uuid NOT NULL REFERENCES slabs(id) ON DELETE CASCADE,
  url text NOT NULL,
  uploaded_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slab_photos_url_not_empty CHECK (length(trim(url)) > 0)
);

CREATE TABLE IF NOT EXISTS damage_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slab_id uuid NOT NULL REFERENCES slabs(id) ON DELETE CASCADE,
  photo_id uuid REFERENCES slab_photos(id) ON DELETE SET NULL,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'minor',
  shape jsonb NOT NULL,
  note text,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT damage_marks_type_check CHECK (type IN ('scratch', 'chip', 'crack', 'stain', 'other')),
  CONSTRAINT damage_marks_severity_check CHECK (severity IN ('minor', 'major')),
  CONSTRAINT damage_marks_shape_object CHECK (jsonb_typeof(shape) = 'object')
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slabs_kind_check') THEN
    ALTER TABLE slabs ADD CONSTRAINT slabs_kind_check CHECK (kind IN ('full_slab', 'remnant'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slabs_availability_check') THEN
    ALTER TABLE slabs ADD CONSTRAINT slabs_availability_check CHECK (availability IN ('available', 'reserved', 'cut', 'hold', 'archived'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slabs_ownership_check') THEN
    ALTER TABLE slabs ADD CONSTRAINT slabs_ownership_check CHECK (ownership IN ('shop_owned', 'job_purchased', 'customer_supplied'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slabs_condition_check') THEN
    ALTER TABLE slabs ADD CONSTRAINT slabs_condition_check CHECK (condition IN ('good', 'minor_damage', 'major_damage'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slabs_tag_code_not_empty') THEN
    ALTER TABLE slabs ADD CONSTRAINT slabs_tag_code_not_empty CHECK (tag_code IS NULL OR length(trim(tag_code)) > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slabs_material_color_fk') THEN
    ALTER TABLE slabs ADD CONSTRAINT slabs_material_color_fk FOREIGN KEY (material_color_id) REFERENCES material_colors(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slabs_storage_location_fk') THEN
    ALTER TABLE slabs ADD CONSTRAINT slabs_storage_location_fk FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slabs_inventory_receipt_fk') THEN
    ALTER TABLE slabs ADD CONSTRAINT slabs_inventory_receipt_fk FOREIGN KEY (inventory_receipt_id) REFERENCES inventory_receipts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS slabs_tag_code_unique_idx
  ON slabs (tag_code)
  WHERE tag_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS slabs_kind_availability_idx
  ON slabs (kind, availability, updated_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE "user"
  DROP CONSTRAINT IF EXISTS user_role_check;

ALTER TABLE "user"
  ADD CONSTRAINT user_role_check
  CHECK (role IN ('admin', 'salesperson', 'templater', 'cutter', 'fabricator', 'installer', 'service_tech', 'inventory_manager'));
