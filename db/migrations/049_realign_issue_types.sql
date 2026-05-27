ALTER TABLE issues
  ALTER COLUMN type TYPE text USING type::text;

UPDATE issues
SET type = CASE type
  WHEN 'workmanship' THEN 'damage_fabrication'
  WHEN 'material' THEN 'wrong_material'
  WHEN 'measurement' THEN 'measurement_error'
  WHEN 'scheduling' THEN 'process_error'
  WHEN 'communication' THEN 'process_error'
  ELSE type
END;

ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_type_check;

ALTER TABLE issues
  ADD CONSTRAINT issues_type_check CHECK (
    type IN (
      'damage_fabrication',
      'damage_install',
      'wrong_material',
      'complaint_cosmetic',
      'complaint_fit',
      'service_callback',
      'measurement_error',
      'process_error',
      'other'
    )
  );
