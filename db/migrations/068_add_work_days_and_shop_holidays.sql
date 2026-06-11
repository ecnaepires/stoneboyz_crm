-- db/migrations/068_add_work_days_and_shop_holidays.sql

ALTER TABLE shops
  ADD COLUMN work_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}';

ALTER TABLE shops
  ADD CONSTRAINT shops_work_days_nonempty CHECK (array_length(work_days, 1) >= 1);

CREATE TABLE shop_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  holiday_date date NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_holidays_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT shop_holidays_shop_date_unique UNIQUE (shop_id, holiday_date)
);

CREATE INDEX shop_holidays_shop_date_idx ON shop_holidays (shop_id, holiday_date);
