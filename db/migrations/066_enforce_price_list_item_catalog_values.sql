UPDATE price_list_items
SET
  item_group = CASE
    WHEN lower(trim(COALESCE(item_group, ''))) IN ('material', 'fabrication', 'edge', 'sink', 'faucet_hole', 'splash', 'admin')
      THEN lower(trim(item_group))
    WHEN category IN ('material') THEN 'material'
    WHEN category IN ('fabrication') THEN 'fabrication'
    WHEN category IN ('finished_edge') THEN 'edge'
    WHEN category IN ('splash') THEN 'splash'
    WHEN category IN ('sink_cutout', 'sink_item') THEN 'sink'
    WHEN category IN ('faucet_hole') THEN 'faucet_hole'
    WHEN lower(trim(COALESCE(item_type, ''))) IN ('material', 'fabrication', 'edge', 'sink', 'faucet_hole', 'splash', 'admin')
      THEN lower(trim(item_type))
    ELSE 'admin'
  END,
  charge_method = CASE
    WHEN lower(trim(COALESCE(charge_method, ''))) IN ('square_foot', 'linear_foot', 'each')
      THEN lower(trim(charge_method))
    WHEN unit IN ('sqft', 'sq_ft') OR category IN ('material', 'fabrication', 'splash') THEN 'square_foot'
    WHEN unit IN ('linft', 'lin_ft') OR category IN ('finished_edge') THEN 'linear_foot'
    ELSE 'each'
  END,
  measurement_basis = CASE
    WHEN lower(trim(COALESCE(measurement_basis, ''))) IN (
      'countertop_sqft',
      'backsplash_sqft',
      'combined_sqft',
      'finished_edge_linft',
      'splash_sqft',
      'sink_count',
      'faucet_hole_count',
      'each'
    )
      THEN lower(trim(measurement_basis))
    WHEN category IN ('material', 'fabrication') THEN 'combined_sqft'
    WHEN category IN ('finished_edge') THEN 'finished_edge_linft'
    WHEN category IN ('splash') THEN 'splash_sqft'
    WHEN category IN ('sink_cutout', 'sink_item') THEN 'sink_count'
    WHEN category IN ('faucet_hole') THEN 'faucet_hole_count'
    ELSE 'each'
  END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_list_items_item_group_allowed'
  ) THEN
    ALTER TABLE price_list_items
      ADD CONSTRAINT price_list_items_item_group_allowed
      CHECK (item_group IN ('material', 'fabrication', 'edge', 'sink', 'faucet_hole', 'splash', 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_list_items_charge_method_allowed'
  ) THEN
    ALTER TABLE price_list_items
      ADD CONSTRAINT price_list_items_charge_method_allowed
      CHECK (charge_method IN ('square_foot', 'linear_foot', 'each'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_list_items_measurement_basis_allowed'
  ) THEN
    ALTER TABLE price_list_items
      ADD CONSTRAINT price_list_items_measurement_basis_allowed
      CHECK (
        measurement_basis IN (
          'countertop_sqft',
          'backsplash_sqft',
          'combined_sqft',
          'finished_edge_linft',
          'splash_sqft',
          'sink_count',
          'faucet_hole_count',
          'each'
        )
      );
  END IF;
END $$;
