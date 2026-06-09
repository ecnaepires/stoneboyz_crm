ALTER TABLE slabs
  DROP CONSTRAINT IF EXISTS slabs_status_check,
  ADD CONSTRAINT slabs_status_check CHECK (status IN ('available', 'negotiating', 'reserved', 'cut', 'remnant'));

ALTER TABLE quote_area_pricing_selections
  ADD COLUMN IF NOT EXISTS material_source text NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS material_slab_id uuid REFERENCES slabs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_material_note text;

ALTER TABLE quote_area_pricing_selections
  DROP CONSTRAINT IF EXISTS quote_area_pricing_selections_material_source_check,
  ADD CONSTRAINT quote_area_pricing_selections_material_source_check
    CHECK (material_source IN ('inventory', 'external')),
  DROP CONSTRAINT IF EXISTS quote_area_pricing_selections_material_source_shape_check,
  ADD CONSTRAINT quote_area_pricing_selections_material_source_shape_check
    CHECK (
      (
        material_source = 'inventory'
        AND material_item_id IS NOT NULL
        AND material_slab_id IS NOT NULL
      )
      OR (
        material_source = 'external'
        AND material_slab_id IS NULL
      )
    );

CREATE INDEX IF NOT EXISTS quote_area_pricing_selections_material_slab_id_idx
  ON quote_area_pricing_selections (material_slab_id)
  WHERE material_slab_id IS NOT NULL;