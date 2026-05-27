DO $$
BEGIN
  CREATE TYPE customer_source_enum AS ENUM (
    'referral_contractor',
    'referral_customer',
    'web_search',
    'walk_in',
    'review_site',
    'social_media',
    'home_show',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE customers
SET source = 'other'
WHERE source IS NOT NULL;

ALTER TABLE customers
  ALTER COLUMN source TYPE customer_source_enum
  USING source::text::customer_source_enum;
