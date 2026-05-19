DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quote_line_items' AND column_name = 'length_mm'
  ) THEN
    ALTER TABLE quote_line_items RENAME COLUMN length_mm TO length_in;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quote_line_items' AND column_name = 'width_mm'
  ) THEN
    ALTER TABLE quote_line_items RENAME COLUMN width_mm TO width_in;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quote_line_items' AND column_name = 'thickness_mm'
  ) THEN
    ALTER TABLE quote_line_items RENAME COLUMN thickness_mm TO thickness_cm;
  END IF;
END $$;

ALTER TABLE quote_line_items ALTER COLUMN length_in TYPE numeric(8,3) USING length_in::numeric;
ALTER TABLE quote_line_items ALTER COLUMN width_in TYPE numeric(8,3) USING width_in::numeric;
ALTER TABLE quote_line_items ALTER COLUMN thickness_cm TYPE numeric(4,1) USING thickness_cm::numeric;
