UPDATE customers
SET type = 'customer', status = 'lead'
WHERE type = 'prospect';

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_type_check;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type_old') THEN
    DROP TYPE customer_type_old;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
    ALTER TYPE customer_type RENAME TO customer_type_old;
  END IF;

  CREATE TYPE customer_type AS ENUM ('customer', 'partner', 'vendor');
END $$;

ALTER TABLE customers
  ALTER COLUMN type TYPE customer_type
  USING type::text::customer_type;

DROP TYPE IF EXISTS customer_type_old;
