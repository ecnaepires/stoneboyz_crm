DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'slabs' AND column_name = 'thickness_in'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'slabs' AND column_name = 'thickness_cm'
  ) THEN
    ALTER TABLE slabs RENAME COLUMN thickness_in TO thickness_cm;
  END IF;
END $$;

ALTER TABLE slabs
  ALTER COLUMN thickness_cm TYPE numeric(4,1),
  DROP CONSTRAINT IF EXISTS slabs_thickness_positive,
  DROP CONSTRAINT IF EXISTS slabs_length_max,
  DROP CONSTRAINT IF EXISTS slabs_width_max,
  DROP CONSTRAINT IF EXISTS slabs_standard_thickness_check,
  ADD CONSTRAINT slabs_thickness_positive CHECK (thickness_cm > 0),
  ADD CONSTRAINT slabs_length_max CHECK (length_in <= 144),
  ADD CONSTRAINT slabs_width_max CHECK (width_in <= 60),
  ADD CONSTRAINT slabs_standard_thickness_check CHECK (thickness_cm IN (2, 3));
