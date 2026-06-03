CREATE TABLE IF NOT EXISTS item_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_group text NOT NULL,
  name text NOT NULL,
  normalized_name text NOT NULL,
  default_charge_method text NOT NULL,
  default_measurement_basis text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_catalog_group_not_blank CHECK (length(trim(item_group)) > 0),
  CONSTRAINT item_catalog_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT item_catalog_charge_method_not_blank CHECK (length(trim(default_charge_method)) > 0),
  CONSTRAINT item_catalog_measurement_basis_not_blank CHECK (length(trim(default_measurement_basis)) > 0),
  CONSTRAINT item_catalog_group_name_unique UNIQUE (item_group, normalized_name)
);

ALTER TABLE price_list_items
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid REFERENCES item_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_group text,
  ADD COLUMN IF NOT EXISTS charge_method text,
  ADD COLUMN IF NOT EXISTS measurement_basis text;

UPDATE price_list_items
SET
  item_group = COALESCE(
    item_group,
    CASE
      WHEN category IN ('material') THEN 'material'
      WHEN category IN ('fabrication') THEN 'fabrication'
      WHEN category IN ('finished_edge') THEN 'edge'
      WHEN category IN ('splash') THEN 'splash'
      WHEN category IN ('sink_cutout', 'sink_item') THEN 'sink'
      WHEN category IN ('faucet_hole') THEN 'faucet_hole'
      ELSE item_type
    END
  ),
  charge_method = COALESCE(
    charge_method,
    CASE
      WHEN unit IN ('sqft', 'sq_ft') OR category IN ('material', 'fabrication', 'splash') THEN 'square_foot'
      WHEN unit IN ('linft', 'lin_ft') OR category IN ('finished_edge') THEN 'linear_foot'
      ELSE 'each'
    END
  ),
  measurement_basis = COALESCE(
    measurement_basis,
    CASE
      WHEN category IN ('material', 'fabrication') THEN 'combined_sqft'
      WHEN category IN ('finished_edge') THEN 'finished_edge_linft'
      WHEN category IN ('splash') THEN 'splash_sqft'
      WHEN category IN ('sink_cutout', 'sink_item') THEN 'sink_count'
      WHEN category IN ('faucet_hole') THEN 'faucet_hole_count'
      ELSE 'each'
    END
  );

ALTER TABLE price_list_items
  ALTER COLUMN item_group SET NOT NULL,
  ALTER COLUMN charge_method SET NOT NULL,
  ALTER COLUMN measurement_basis SET NOT NULL;

ALTER TABLE price_list_items
  ADD CONSTRAINT price_list_items_item_group_not_blank CHECK (length(trim(item_group)) > 0),
  ADD CONSTRAINT price_list_items_charge_method_not_blank CHECK (length(trim(charge_method)) > 0),
  ADD CONSTRAINT price_list_items_measurement_basis_not_blank CHECK (length(trim(measurement_basis)) > 0);

CREATE INDEX IF NOT EXISTS price_list_items_catalog_item_idx
  ON price_list_items (catalog_item_id);
