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

ALTER TABLE slabs
  ADD CONSTRAINT slabs_material_color_fk FOREIGN KEY (material_color_id) REFERENCES material_colors(id) ON DELETE SET NULL,
  ADD CONSTRAINT slabs_storage_location_fk FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id) ON DELETE SET NULL,
  ADD CONSTRAINT slabs_inventory_receipt_fk FOREIGN KEY (inventory_receipt_id) REFERENCES inventory_receipts(id) ON DELETE SET NULL;
